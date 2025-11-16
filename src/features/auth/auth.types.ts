// Re-export shared types
export type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  UpdateProfileDTO,
  ChangePasswordDTO,
  JWTPayload,
} from '@vertical-vibing/shared-types';

export {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@vertical-vibing/shared-types';
