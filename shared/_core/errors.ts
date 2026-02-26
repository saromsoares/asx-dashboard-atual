import { TRPCError } from "@trpc/server";

export function ForbiddenError(message: string): TRPCError {
  return new TRPCError({
    code: "FORBIDDEN",
    message,
  });
}

export function NotFoundError(message: string): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message,
  });
}
