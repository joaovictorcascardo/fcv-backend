import { Request, Response, NextFunction } from "express";

type Registro = { tentativas: number; inicio: number };

export function limitarTentativas(maximo = 10, janelaMinutos = 15) {
  const registros = new Map<number, Registro>();
  const janela = janelaMinutos * 60_000;

  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = Number(res.locals.usuario.id);
    const agora = Date.now();
    let registro = registros.get(usuario);
    if (!registro || agora - registro.inicio > janela) {
      registro = { tentativas: 0, inicio: agora };
      registros.set(usuario, registro);
    }

    if (registro.tentativas >= maximo) {
      const minutos = Math.ceil((registro.inicio + janela - agora) / 60_000);
      res.status(429).json({ erro: `Muitos códigos errados. Tente de novo em ${minutos} minuto(s)` });
      return;
    }

    const atual = registro;
    atual.tentativas++;
    res.on("finish", () => {
      if (res.statusCode !== 404 && atual.tentativas > 0) atual.tentativas--;
    });
    next();
  };
}
