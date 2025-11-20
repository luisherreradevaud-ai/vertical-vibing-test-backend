import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Code,
} from '@react-email/components';

interface EmailVerificationEmailProps {
  userName: string;
  verificationUrl: string;
  verificationCode?: string;
  expiryHours?: number;
  companyName?: string;
}

export const EmailVerificationEmail = ({
  userName,
  verificationUrl,
  verificationCode,
  expiryHours = 24,
  companyName = 'Vertical Vibing',
}: EmailVerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Verify Your Email Address</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Thank you for signing up for {companyName}! To complete your registration and activate your account,
              please verify your email address.
            </Text>
            {verificationCode && (
              <>
                <Text style={paragraph}>
                  You can verify your email by clicking the button below or by entering this verification code:
                </Text>
                <Section style={codeContainer}>
                  <Text style={codeText}>{verificationCode}</Text>
                </Section>
              </>
            )}
            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>
            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Code style={code}>{verificationUrl}</Code>
            <Hr style={hr} />
            <Text style={footer}>
              This verification link will expire in {expiryHours} hours.
            </Text>
            <Text style={footer}>
              If you didn't create an account with {companyName}, you can safely ignore this email.
            </Text>
            <Text style={footer}>
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailVerificationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const content = {
  padding: '0 48px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  marginBottom: '24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  marginBottom: '16px',
};

const codeContainer = {
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const codeText = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#5469d4',
  letterSpacing: '8px',
  margin: '0',
};

const buttonContainer = {
  padding: '27px 0 27px',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const code = {
  display: 'inline-block',
  padding: '12px 16px',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #e1e1e1',
  color: '#333',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  marginTop: '8px',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '12px',
};
