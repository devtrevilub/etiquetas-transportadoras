import { HttpException } from '@nestjs/common';

export class DestinoIndisponivelException extends HttpException {
  constructor(cause?: any) {
    const causeStatus = cause?.response?.status;
    const status = causeStatus && causeStatus < 500 ? 422 : 502;

    super(
      {
        code: 'DESTINO_UNAVAILABLE',
        message: 'Falha ao entregar etiqueta(s) ao Sistema de Destino.',
      },
      status,
    );
  }
}
