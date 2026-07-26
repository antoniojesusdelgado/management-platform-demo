export type ActionErrorCode =
  | "validation_error"
  | "authentication_required"
  | "permission_denied"
  | "conflict"
  | "unexpected_error";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string };

export function actionSuccess<T = undefined>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function actionFailure(
  code: ActionErrorCode,
  message: string,
): ActionResult<never> {
  return { ok: false, code, message };
}
