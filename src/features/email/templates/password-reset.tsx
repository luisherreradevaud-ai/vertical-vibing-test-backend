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

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiryHours?: number;
  companyName?: string;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  expiryHours = 24,
  companyName = 'Vertical Vibing',
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your {companyName} password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Password Reset Request</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              We received a request to reset your password for your {companyName} account. If you didn't make this
              request, you can safely ignore this email.
            </Text>
            <Text style={paragraph}>
              To reset your password, click the button below. This link will expire in {expiryHours} hours.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>
            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Code style={code}>{resetUrl}</Code>
            <Hr style={hr} />
            <Text style={footer}>
              If you didn't request a password reset, please ignore this email or contact our support team if you have
              concerns.
            </Text>
            <Text style={footer}>
              This link will expire in {expiryHours} hours for security reasons.
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

export default PasswordResetEmail;

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
