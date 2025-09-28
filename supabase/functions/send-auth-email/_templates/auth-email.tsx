import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
  Row,
  Column,
  Img,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface AuthEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const AuthEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
}: AuthEmailProps) => {
  const getEmailContent = () => {
    switch (email_action_type) {
      case 'signup':
        return {
          title: 'Welcome to Bitwhaletrack!',
          heading: 'Verify Your Account',
          message: 'Thank you for joining Bitwhaletrack. Click the button below to verify your email address and start tracking crypto news.',
          buttonText: 'Verify Email',
          preview: 'Welcome to Bitwhaletrack - Verify your account'
        }
      case 'recovery':
        return {
          title: 'Reset Your Password',
          heading: 'Password Reset Request',
          message: 'We received a request to reset your password. Use the verification code below or click the button to reset your password.',
          buttonText: 'Reset Password',
          preview: 'Reset your Bitwhaletrack password'
        }
      case 'email_change':
        return {
          title: 'Confirm Email Change',
          heading: 'Confirm Email Change',
          message: 'Please confirm your new email address for your Bitwhaletrack account.',
          buttonText: 'Confirm Email Change',
          preview: 'Confirm your new email address'
        }
      default:
        return {
          title: 'Bitwhaletrack Account Verification',
          heading: 'Verify Your Account',
          message: 'Please verify your account to continue using Bitwhaletrack.',
          buttonText: 'Verify Account',
          preview: 'Verify your Bitwhaletrack account'
        }
    }
  }

  const content = getEmailContent()

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <div style={logoContainer}>
                  <div style={bitcoinIcon}>₿</div>
                  <Text style={logoText}>Bitwhaletrack</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content_section}>
            <Heading style={h1}>{content.heading}</Heading>
            <Text style={text}>{content.message}</Text>

            {/* Verification Code (for recovery) */}
            {email_action_type === 'recovery' && (
              <Section style={codeSection}>
                <Text style={codeLabel}>Your 6-digit verification code:</Text>
                <div style={codeContainer}>
                  {token.split('').map((digit, index) => (
                    <div key={index} style={digitBox}>
                      <Text style={digitText}>{digit}</Text>
                    </div>
                  ))}
                </div>
                <Text style={codeSubText}>Enter this code in the app to reset your password</Text>
              </Section>
            )}

            {/* Action Button */}
            <Section style={buttonSection}>
              <Link
                href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
                style={button}
              >
                {content.buttonText}
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              If you didn't request this email, you can safely ignore it.
            </Text>
            
            <Text style={footerText}>
              This link will expire in 24 hours for security reasons.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2024 Bitwhaletrack. Your trusted crypto news platform.
            </Text>
            <Text style={footerLink}>
              <Link href="https://bitwhaletrack.com" style={link}>
                Visit our website
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default AuthEmail

// Styles
const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#1a1a1a',
  padding: '40px 20px',
  textAlign: 'center' as const,
}

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
}

const bitcoinIcon = {
  fontSize: '32px',
  color: '#f7931a',
  fontWeight: 'bold',
}

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0',
  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const content_section = {
  padding: '40px 40px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 30px 0',
}

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 30px 0',
  textAlign: 'center' as const,
}

const codeSection = {
  textAlign: 'center' as const,
  margin: '30px 0',
  padding: '30px 20px',
  backgroundColor: '#f7fafc',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
}

const codeLabel = {
  color: '#4a5568',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 20px 0',
}

const codeContainer = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  margin: '20px 0',
}

const digitBox = {
  backgroundColor: '#ffffff',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  width: '50px',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
}

const digitText = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  fontFamily: 'Monaco, "Lucida Console", monospace',
  margin: '0',
}

const codeSubText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '15px 0 0 0',
  fontStyle: 'italic',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  transition: 'all 0.2s ease',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '30px 0',
}

const footer = {
  backgroundColor: '#f7fafc',
  padding: '30px 40px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 10px 0',
}

const footerLink = {
  margin: '10px 0 0 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
}