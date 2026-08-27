import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OtpEntity } from './entities/otp.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
  ) {}

  async generateAndSendOtp(email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.otpRepository.delete({ email });

    const otp = this.otpRepository.create({
      email,
      codeHash,
      expiresAt,
    });
    await this.otpRepository.save(otp);

    console.log(`\n=========================================`);
    console.log(`✉️ MOCK EMAIL DISPATCH`);
    console.log(`To: ${email}`);
    console.log(`Subject: Your login code`);
    console.log(`Your code: ${code}`);
    console.log(
      `Or click the Magic Link: http://localhost:3000/magic-login?email=${email}&code=${code}`,
    );
    console.log(`=========================================\n`);
  }
}
