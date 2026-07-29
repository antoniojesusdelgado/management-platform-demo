import { z } from "zod";

const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const executableMarkup =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|style|link|meta)\b|(?:^|[\s"'`])on[a-z]+\s*=|javascript\s*:/iu;

type PlainTextOptions = {
  min?: number;
  max: number;
};

export function plainTextSchema({
  min = 0,
  max,
}: PlainTextOptions) {
  return z
    .string()
    .trim()
    .transform((value) => value.normalize("NFC"))
    .pipe(
      z
        .string()
        .min(min)
        .max(max)
        .refine(
          (value) => !unsafeControlCharacters.test(value),
          "El texto contiene caracteres de control no permitidos.",
        )
        .refine(
          (value) => !executableMarkup.test(value),
          "El texto contiene marcado ejecutable no permitido.",
        ),
    );
}
