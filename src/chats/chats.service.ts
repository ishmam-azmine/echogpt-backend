import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { SendPromptDto } from './dto/send-prompt.dto.js';

type AiResult = {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
};

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async sendPrompt(userId: string, dto: SendPromptDto) {
    await this.subscriptionsService.ensureUsageAvailable(userId);

    const provider = await this.providersService.getUsableProvider(
      dto.providerId,
    );

    if (!provider.apiKey) {
      throw new BadRequestException(
        `${provider.name} does not have an API key configured`,
      );
    }

    const model =
      dto.model ??
      provider.defaultModel ??
      this.defaultModel(provider.type);

    const conversation = dto.conversationId
      ? await this.getOwnedConversation(userId, dto.conversationId)
      : await this.prisma.conversation.create({
          data: {
            userId,
            providerId: provider.id,
            model,
            title: this.createTitle(dto.prompt),
          },
        });

    const previousMessages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        role: true,
        content: true,
      },
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.prompt,
      },
    });

    const startedAt = Date.now();

    try {
      const result = await this.callProvider(
        provider.type,
        provider.apiKey,
        provider.baseUrl,
        model,
        [
          ...previousMessages,
          {
            role: 'USER' as const,
            content: dto.prompt,
          },
        ],
      );

      const totalTokens =
        (result.promptTokens ?? 0) +
        (result.completionTokens ?? 0);

      const [, assistantMessage] = await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            providerId: provider.id,
            model,
          },
        }),

        this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: result.content,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
          },
        }),

        this.prisma.subscription.update({
          where: {
            userId,
          },
          data: {
            requestsUsed: {
              increment: 1,
            },
          },
        }),

        this.prisma.apiUsageLog.create({
          data: {
            userId,
            providerId: provider.id,
            endpoint: '/api/v1/chats/prompt',
            model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            totalTokens,
            status: 'SUCCESS',
            responseTimeMs: Date.now() - startedAt,
          },
        }),
      ]);

      return {
        conversationId: conversation.id,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
        },
        model,
        response: assistantMessage.content,
        usage: {
          promptTokens: result.promptTokens ?? null,
          completionTokens: result.completionTokens ?? null,
          totalTokens: totalTokens || null,
        },
      };
    } catch (error) {
      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          providerId: provider.id,
          endpoint: '/api/v1/chats/prompt',
          model,
          status: 'FAILED',
          responseTimeMs: Date.now() - startedAt,
        },
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error
          ? `AI provider request failed: ${error.message}`
          : 'AI provider request failed',
      );
    }
  }

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.getOwnedConversation(userId, conversationId);

    await this.prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return {
      message: 'Conversation deleted successfully',
    };
  }

  private async getOwnedConversation(
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async callProvider(
    type: 'OPENAI' | 'ANTHROPIC' | 'GEMINI',
    apiKey: string,
    baseUrl: string | null,
    model: string,
    messages: Array<{
      role: 'USER' | 'ASSISTANT' | 'SYSTEM';
      content: string;
    }>,
  ): Promise<AiResult> {
    switch (type) {
      case 'OPENAI':
        return this.callOpenAi(
          apiKey,
          baseUrl,
          model,
          messages,
        );

      case 'ANTHROPIC':
        return this.callAnthropic(
          apiKey,
          baseUrl,
          model,
          messages,
        );

      case 'GEMINI':
        return this.callGemini(
          apiKey,
          baseUrl,
          model,
          messages,
        );
    }
  }

  private async callOpenAi(
    apiKey: string,
    baseUrl: string | null,
    model: string,
    messages: Array<{
      role: 'USER' | 'ASSISTANT' | 'SYSTEM';
      content: string;
    }>,
  ): Promise<AiResult> {
    const response = await fetch(
      `${baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages.map((message) => ({
            role: message.role.toLowerCase(),
            content: message.content,
          })),
        }),
      },
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(
        data?.error?.message ??
          `OpenAI returned HTTP ${response.status}`,
      );
    }

    return {
      content: data?.choices?.[0]?.message?.content ?? '',
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
    };
  }

  private async callAnthropic(
    apiKey: string,
    baseUrl: string | null,
    model: string,
    messages: Array<{
      role: 'USER' | 'ASSISTANT' | 'SYSTEM';
      content: string;
    }>,
  ): Promise<AiResult> {
    const systemMessages = messages
      .filter((message) => message.role === 'SYSTEM')
      .map((message) => message.content)
      .join('\n');

    const chatMessages = messages
      .filter((message) => message.role !== 'SYSTEM')
      .map((message) => ({
        role:
          message.role === 'ASSISTANT'
            ? 'assistant'
            : 'user',
        content: message.content,
      }));

    const response = await fetch(
      `${baseUrl ?? 'https://api.anthropic.com/v1'}/messages`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          ...(systemMessages
            ? { system: systemMessages }
            : {}),
          messages: chatMessages,
        }),
      },
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(
        data?.error?.message ??
          `Anthropic returned HTTP ${response.status}`,
      );
    }

    const content = Array.isArray(data?.content)
      ? data.content
          .filter((item: any) => item?.type === 'text')
          .map((item: any) => item.text)
          .join('')
      : '';

    return {
      content,
      promptTokens: data?.usage?.input_tokens,
      completionTokens: data?.usage?.output_tokens,
    };
  }

  private async callGemini(
    apiKey: string,
    baseUrl: string | null,
    model: string,
    messages: Array<{
      role: 'USER' | 'ASSISTANT' | 'SYSTEM';
      content: string;
    }>,
  ): Promise<AiResult> {
    const contents = messages
      .filter((message) => message.role !== 'SYSTEM')
      .map((message) => ({
        role:
          message.role === 'ASSISTANT'
            ? 'model'
            : 'user',
        parts: [
          {
            text: message.content,
          },
        ],
      }));

    const systemInstruction = messages
      .filter((message) => message.role === 'SYSTEM')
      .map((message) => message.content)
      .join('\n');

    const root =
      baseUrl ??
      'https://generativelanguage.googleapis.com/v1beta';

    const response = await fetch(
      `${root}/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
              }
            : {}),
          contents,
        }),
      },
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(
        data?.error?.message ??
          `Gemini returned HTTP ${response.status}`,
      );
    }

    const parts =
      data?.candidates?.[0]?.content?.parts ?? [];

    return {
      content: parts
        .map((part: any) => part?.text ?? '')
        .join(''),
      promptTokens:
        data?.usageMetadata?.promptTokenCount,
      completionTokens:
        data?.usageMetadata?.candidatesTokenCount,
    };
  }

  private defaultModel(
    type: 'OPENAI' | 'ANTHROPIC' | 'GEMINI',
  ) {
    switch (type) {
      case 'OPENAI':
        return 'gpt-4o-mini';
      case 'ANTHROPIC':
        return 'claude-3-5-haiku-latest';
      case 'GEMINI':
        return 'gemini-2.0-flash';
    }
  }

  private createTitle(prompt: string) {
    const clean = prompt.replace(/\s+/g, ' ').trim();
    return clean.length > 60
      ? `${clean.slice(0, 57)}...`
      : clean;
  }
}
