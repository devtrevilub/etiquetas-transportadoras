import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DestinoIndisponivelException } from './destino-indisponivel.exception';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class DestinoService {
  private readonly logger = new Logger(DestinoService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envia o payload já transformado ao Sistema de Destino, com retry e
   * backoff exponencial para falhas transitórias (timeout, 429, 5xx).
   */
  async enviar(endpoint: string, payload: any, correlationId: string): Promise<any> {
    const maxRetries = this.configService.get<number>('destino.maxRetries') ?? 3;
    const baseDelay = this.configService.get<number>('destino.retryBaseDelayMs') ?? 300;

    let attempt = 0;
    let lastError: AxiosError | undefined;

    while (attempt <= maxRetries) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(endpoint, payload, {
            headers: { 'X-Correlation-Id': correlationId },
          }),
        );
        return response.data;
      } catch (error) {
        lastError = error as AxiosError;
        const retryable = this.isRetryable(lastError);

        this.logger.warn(
          `Falha ao enviar ao Sistema de Destino [correlationId=${correlationId}] [attempt=${attempt}] [retryable=${retryable}] [status=${lastError.response?.status}]: ${lastError.message}`,
        );

        if (!retryable || attempt === maxRetries) {
          break;
        }

        await sleep(baseDelay * 2 ** attempt);
        attempt += 1;
      }
    }

    throw new DestinoIndisponivelException(lastError);
  }

  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // erro de rede/timeout
    const status = error.response.status;
    return status === 429 || (status >= 500 && status <= 599);
  }
}
