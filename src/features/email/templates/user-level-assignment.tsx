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

interface UserLevelAssignmentEmailProps {
  userName: string;
  companyName: string;
  oldLevelName?: string;
  newLevelName: string;
  assignedBy: string;
  levelDescription?: string;
  dashboardUrl: string;
  appName?: string;
}

export const UserLevelAssignmentEmail = ({
  userName,
  companyName,
  oldLevelName,
  newLevelName,
  assignedBy,
  levelDescription,
  dashboardUrl,
  appName = 'Vertical Vibing',
}: UserLevelAssignmentEmailProps) => {
  const isUpdate = oldLevelName && oldLevelName !== newLevelName;
  const actionText = isUpdate ? 'updated' : 'assigned';

  return (
    <Html>
      <Head />
      <Preview>Your access level has been {actionText} in {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>Access Level {isUpdate ? 'Updated' : 'Assigned'}</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Your access level has been {actionText} by <strong>{assignedBy}</strong> in <strong>{companyName}</strong>.
            </Text>
            <Section style={infoBox}>
              {isUpdate && (
                <>
                  <Text style={infoLabel}>Previous Level:</Text>
                  <Text style={infoValueMuted}>{oldLevelName}</Text>
                </>
              )}
              <Text style={infoLabel}>New Level:</Text>
              <Text style={infoValueHighlight}>{newLevelName}</Text>
              {levelDescription && (
                <>
                  <Text style={infoLabel}>Description:</Text>
                  <Text style={infoValue}>{levelDescription}</Text>
                </>
              )}
            </Section>
            <Text style={paragraph}>
              This change affects your permissions and the features you can access within the platform.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View Dashboard
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              If you have questions about this change, please contact your administrator or support team.
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

export default UserLevelAssignmentEmail;

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

const infoValueMuted = {
  fontSize: '16px',
  color: '#8898aa',
  fontWeight: '500',
  margin: '0 0 12px 0',
  textDecoration: 'line-through',
};

const infoValueHighlight = {
  fontSize: '18px',
  color: '#5469d4',
  fontWeight: '700',
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
