import { Request, Response, NextFunction } from "express";

type Registro = { falhas: number; inicio: number };

export function limitarTentativas(maximo = 10, janelaMinutos = 15) {
  const tentativas = new Map<number, Registro>();
  const janela = janelaMinutos * 60_000;

  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = Number(res.locals.usuario.id);
    const agora = Date.now();
    const atual = tentativas.get(usuario);
    if (atual && agora - atual.inicio > janela) tentativas.delete(usuario);

    const registro = tentativas.get(usuario);
    if (registro && registro.falhas >= maximo) {
      const minutos = Math.ceil((registro.inicio + janela - agora) / 60_000);
      res.status(429).json({ erro: `Muitos códigos errados. Tente de novo em ${minutos} minuto(s)` });
      return;
    }

    res.on("finish", () => {
      if (res.statusCode !== 404) return;
      const existente = tentativas.get(usuario);
      if (existente) existente.falhas++;
      else tentativas.set(usuario, { falhas: 1, inicio: Date.now() });
    });
    next();
  };
}
