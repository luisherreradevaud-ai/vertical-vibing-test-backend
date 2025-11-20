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
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  companyName?: string;
  loginUrl: string;
}

export const WelcomeEmail = ({
  userName,
  companyName = 'Vertical Vibing',
  loginUrl,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {companyName} - Let's get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Welcome to {companyName}!</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              We're excited to have you on board. Your account has been successfully created, and you're
              all set to start using our platform.
            </Text>
            <Text style={paragraph}>
              To get started, simply log in to your account and explore all the features we have to offer.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Get Started
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              If you didn't create this account, please ignore this email or contact our support team.
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

export default WelcomeEmail;

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
