import { Equals, IsBoolean, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Password complexity aligned with NIST 800-63B / HIPAA §164.308(a)(5)(ii)(D):
// 12+ chars with upper, lower, number, and symbol. Length is the primary strength driver.
export const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

export class RegisterDto {
  @IsString() @MaxLength(120)
  organizationName: string;

  @IsString() @MaxLength(80)
  firstName: string;

  @IsString() @MaxLength(80)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD, {
    message:
      'Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.',
  })
  password: string;

  // Part 11 / SOC 2 CC2: explicit acknowledgement captured + audited at account creation.
  @IsBoolean()
  @Equals(true, { message: 'You must acknowledge the terms and PHI-handling notice to create an account.' })
  acceptedTerms: boolean;
}
