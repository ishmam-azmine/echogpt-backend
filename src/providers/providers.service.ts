import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt, encrypt } from '../common/utils/encryption.util.js';
import type { CreateProviderDto } from './dto/create-provider.dto.js';
import type { UpdateProviderDto } from './dto/update-provider.dto.js';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProviderDto) {
    const existing = await this.prisma.aiProvider.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(
        'An AI provider with this name already exists',
      );
    }

    if (dto.isDefault) {
      await this.clearDefault();
    }

    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        apiKeyEncrypted: dto.apiKey ? encrypt(dto.apiKey) : null,
        baseUrl: dto.baseUrl,
        defaultModel: dto.defaultModel,
        isEnabled: dto.isEnabled ?? true,
        isDefault: dto.isDefault ?? false,
      },
    });

    return this.safeProvider(provider);
  }

  async findAll() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return providers.map((provider) => this.safeProvider(provider));
  }

  async findOne(id: string) {
    const provider = await this.getProvider(id);
    return this.safeProvider(provider);
  }

  async update(id: string, dto: UpdateProviderDto) {
    await this.getProvider(id);

    if (dto.name) {
      const duplicate = await this.prisma.aiProvider.findFirst({
        where: {
          name: dto.name.trim(),
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'An AI provider with this name already exists',
        );
      }
    }

    if (dto.isDefault === true) {
      await this.clearDefault(id);
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.apiKey !== undefined && {
          apiKeyEncrypted: dto.apiKey ? encrypt(dto.apiKey) : null,
        }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.defaultModel !== undefined && {
          defaultModel: dto.defaultModel,
        }),
        ...(dto.isEnabled !== undefined && {
          isEnabled: dto.isEnabled,
        }),
        ...(dto.isDefault !== undefined && {
          isDefault: dto.isDefault,
        }),
      },
    });

    return this.safeProvider(provider);
  }

  async remove(id: string) {
    await this.getProvider(id);

    await this.prisma.aiProvider.delete({
      where: { id },
    });

    return {
      message: 'AI provider deleted successfully',
    };
  }

  async toggle(id: string) {
    const provider = await this.getProvider(id);

    const updated = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        isEnabled: !provider.isEnabled,
        ...(provider.isEnabled && provider.isDefault
          ? { isDefault: false }
          : {}),
      },
    });

    return {
      message: updated.isEnabled
        ? 'AI provider enabled successfully'
        : 'AI provider disabled successfully',
      provider: this.safeProvider(updated),
    };
  }

  async setDefault(id: string) {
    const provider = await this.getProvider(id);

    if (!provider.isEnabled) {
      throw new BadRequestException(
        'A disabled provider cannot be set as default',
      );
    }

    await this.prisma.$transaction([
      this.prisma.aiProvider.updateMany({
        where: {
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      }),
      this.prisma.aiProvider.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return {
      message: 'Default AI provider updated successfully',
      provider: this.safeProvider({
        ...provider,
        isDefault: true,
      }),
    };
  }

  async health(id: string) {
    const provider = await this.getProvider(id);

    if (!provider.isEnabled) {
      return {
        provider: provider.name,
        status: 'DISABLED',
        healthy: false,
      };
    }

    if (!provider.apiKeyEncrypted) {
      return {
        provider: provider.name,
        status: 'MISSING_API_KEY',
        healthy: false,
      };
    }

    let apiKey: string;

    try {
      apiKey = decrypt(provider.apiKeyEncrypted);
    } catch {
      return {
        provider: provider.name,
        status: 'INVALID_ENCRYPTED_KEY',
        healthy: false,
      };
    }

    try {
      const result = await this.performHealthRequest(
        provider.type,
        apiKey,
        provider.baseUrl,
      );

      return {
        provider: provider.name,
        type: provider.type,
        healthy: result.healthy,
        status: result.status,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        provider: provider.name,
        type: provider.type,
        healthy: false,
        status: 'UNREACHABLE',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async getUsableProvider(id?: string) {
    const provider = id
      ? await this.prisma.aiProvider.findUnique({ where: { id } })
      : await this.prisma.aiProvider.findFirst({
          where: {
            isDefault: true,
            isEnabled: true,
          },
        });

    if (!provider) {
      throw new NotFoundException(
        id
          ? 'AI provider not found'
          : 'No default AI provider configured',
      );
    }

    if (!provider.isEnabled) {
      throw new BadRequestException('AI provider is disabled');
    }

    return {
      ...provider,
      apiKey: provider.apiKeyEncrypted
        ? decrypt(provider.apiKeyEncrypted)
        : null,
    };
  }

  private async performHealthRequest(
    type: 'OPENAI' | 'ANTHROPIC' | 'GEMINI',
    apiKey: string,
    customBaseUrl: string | null,
  ) {
    let url: string;
    let headers: Record<string, string>;

    switch (type) {
      case 'OPENAI':
        url = `${customBaseUrl ?? 'https://api.openai.com/v1'}/models`;
        headers = {
          Authorization: `Bearer ${apiKey}`,
        };
        break;

      case 'ANTHROPIC':
        url = `${customBaseUrl ?? 'https://api.anthropic.com/v1'}/models`;
        headers = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        };
        break;

      case 'GEMINI':
        url = `${
          customBaseUrl ??
          'https://generativelanguage.googleapis.com/v1beta'
        }/models?key=${encodeURIComponent(apiKey)}`;
        headers = {};
        break;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      return {
        healthy: response.ok,
        status: response.ok
          ? 'HEALTHY'
          : `PROVIDER_HTTP_${response.status}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getProvider(id: string) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    return provider;
  }

  private async clearDefault(exceptId?: string) {
    await this.prisma.aiProvider.updateMany({
      where: {
        isDefault: true,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      data: {
        isDefault: false,
      },
    });
  }

  private safeProvider(provider: {
    id: string;
    name: string;
    type: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
    apiKeyEncrypted: string | null;
    baseUrl: string | null;
    defaultModel: string | null;
    isEnabled: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      hasApiKey: Boolean(provider.apiKeyEncrypted),
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
