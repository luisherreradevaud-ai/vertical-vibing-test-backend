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

interface TeamInvitationEmailProps {
  invitedEmail: string;
  inviterName: string;
  companyName: string;
  roleName: string;
  invitationUrl: string;
  expiryDays?: number;
  appName?: string;
}

export const TeamInvitationEmail = ({
  invitedEmail,
  inviterName,
  companyName,
  roleName,
  invitationUrl,
  expiryDays = 7,
  appName = 'Vertical Vibing',
}: TeamInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {companyName} on {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>You're Invited!</Text>
            <Text style={paragraph}>Hi there,</Text>
            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join <strong>{companyName}</strong> on {appName}.
            </Text>
            <Section style={infoBox}>
              <Text style={infoLabel}>Role:</Text>
              <Text style={infoValue}>{roleName}</Text>
              <Text style={infoLabel}>Company:</Text>
              <Text style={infoValue}>{companyName}</Text>
              <Text style={infoLabel}>Email:</Text>
              <Text style={infoValue}>{invitedEmail}</Text>
            </Section>
            <Text style={paragraph}>
              Click the button below to accept the invitation and create your account. This invitation will expire in{' '}
              {expiryDays} days.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={invitationUrl}>
                Accept Invitation
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
            <Text style={footer}>
              This invitation will expire in {expiryDays} days for security reasons.
            </Text>
            <Text style={footer}>
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamInvitationEmail;

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

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '5px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e6ebf1',
};

const infoLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '8px 0 4px 0',
};

const infoValue = {
  fontSize: '16px',
  color: '#484848',
  fontWeight: '500',
  margin: '0 0 12px 0',
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
