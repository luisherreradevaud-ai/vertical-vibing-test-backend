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

interface PermissionChange {
  permission: string;
  action: 'granted' | 'revoked';
  resource?: string;
}

interface PermissionChangesEmailProps {
  userName: string;
  companyName: string;
  changedBy: string;
  changes: PermissionChange[];
  reason?: string;
  dashboardUrl: string;
  appName?: string;
}

export const PermissionChangesEmail = ({
  userName,
  companyName,
  changedBy,
  changes,
  reason,
  dashboardUrl,
  appName = 'Vertical Vibing',
}: PermissionChangesEmailProps) => {
  const granted = changes.filter((c) => c.action === 'granted');
  const revoked = changes.filter((c) => c.action === 'revoked');

  return (
    <Html>
      <Head />
      <Preview>Your permissions have been updated in {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Permission Changes</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Your permissions have been updated by <strong>{changedBy}</strong> in <strong>{companyName}</strong>.
            </Text>

            {reason && (
              <Section style={reasonBox}>
                <Text style={reasonLabel}>Reason:</Text>
                <Text style={reasonText}>{reason}</Text>
              </Section>
            )}

            {granted.length > 0 && (
              <Section style={permissionSection}>
                <Text style={sectionTitle}>✅ Permissions Granted</Text>
                {granted.map((change, index) => (
                  <Section key={index} style={permissionItem}>
                    <Text style={permissionName}>{change.permission}</Text>
                    {change.resource && <Text style={resourceText}>Resource: {change.resource}</Text>}
                  </Section>
                ))}
              </Section>
            )}

            {revoked.length > 0 && (
              <Section style={permissionSection}>
                <Text style={sectionTitle}>❌ Permissions Revoked</Text>
                {revoked.map((change, index) => (
                  <Section key={index} style={permissionItem}>
                    <Text style={permissionName}>{change.permission}</Text>
                    {change.resource && <Text style={resourceText}>Resource: {change.resource}</Text>}
                  </Section>
                ))}
              </Section>
            )}

            <Text style={paragraph}>
              These changes are effective immediately. Your new permissions will be reflected the next time you access
              the platform.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View My Permissions
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>
              If you have questions about these changes, please contact your administrator or support team.
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

export default PermissionChangesEmail;

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

const reasonBox = {
  backgroundColor: '#fff8e1',
  borderLeft: '4px solid #ffc107',
  borderRadius: '5px',
  padding: '16px',
  margin: '24px 0',
};

const reasonLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#f57c00',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const reasonText = {
  fontSize: '14px',
  color: '#484848',
  margin: '0',
  lineHeight: '1.5',
};

const permissionSection = {
  margin: '24px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#484848',
  margin: '0 0 16px 0',
};

const permissionItem = {
  backgroundColor: '#f8f9fa',
  borderRadius: '5px',
  padding: '12px 16px',
  marginBottom: '8px',
  border: '1px solid #e6ebf1',
};

const permissionName = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#484848',
  margin: '0',
  fontFamily: 'monospace',
};

const resourceText = {
  fontSize: '12px',
  color: '#8898aa',
  margin: '4px 0 0 0',
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
