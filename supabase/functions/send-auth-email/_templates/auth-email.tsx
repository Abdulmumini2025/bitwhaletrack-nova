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
          {/* Professional Header */}
          <Section style={modernHeader}>
            <Row>
              <Column align="center">
                <div style={brandContainer}>
                  <div style={logoWrapper}>
                    <div style={cryptoSymbol}>₿</div>
                    <Text style={brandName}>Bitwhaletrack</Text>
                  </div>
                  <Text style={tagline}>Your Premier Crypto News Platform</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={modernContent}>
            <div style={contentCard}>
              <Heading style={modernH1}>{content.heading}</Heading>
              <Text style={modernText}>{content.message}</Text>

              {/* Beautiful Verification Code */}
              {email_action_type === 'recovery' && (
                <div style={modernCodeSection}>
                  <Text style={modernCodeLabel}>Your verification code</Text>
                  <div style={modernCodeContainer}>
                    {token.split('').map((digit, index) => (
                      <div key={index} style={modernDigitBox}>
                        <Text style={modernDigitText}>{digit}</Text>
                      </div>
                    ))}
                  </div>
                  <Text style={modernCodeSubText}>Enter this code in the app to reset your password</Text>
                </div>
              )}

              {/* Modern Action Button */}
              <div style={modernButtonSection}>
                <Link
                  href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
                  style={modernButton}
                >
                  {content.buttonText}
                </Link>
              </div>

              <Hr style={modernHr} />

              <div style={securityNotice}>
                <Text style={noticeText}>
                  🔒 If you didn't request this email, you can safely ignore it.
                </Text>
                <Text style={noticeSubText}>
                  This link will expire in 24 hours for security reasons.
                </Text>
              </div>
            </div>
          </Section>

          {/* Modern Footer */}
          <Section style={modernFooter}>
            <div style={footerContent}>
              <Text style={modernFooterText}>
                © 2024 Bitwhaletrack. Your trusted cryptocurrency news platform.
              </Text>
              <div style={footerLinks}>
                <Link href="https://bitwhaletrack.com" style={modernLink}>
                  Visit Website
                </Link>
                <Text style={footerSeparator}>•</Text>
                <Link href="https://bitwhaletrack.com/support" style={modernLink}>
                  Support
                </Link>
              </div>
              <Text style={footerTagline}>
                Stay ahead of the crypto market with real-time insights
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default AuthEmail

// Modern Professional Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Inter", sans-serif',
  margin: '0',
  padding: '0',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
}

// Modern Header Styles
const modernHeader = {
  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  padding: '50px 30px',
  textAlign: 'center' as const,
}

const brandContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '16px',
}

const logoWrapper = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
}

const cryptoSymbol = {
  fontSize: '40px',
  color: '#f7931a',
  fontWeight: 'bold',
  textShadow: '0 2px 4px rgba(247, 147, 26, 0.3)',
}

const brandName = {
  fontSize: '36px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
  background: 'linear-gradient(135deg, #3b82f6, #06b6d4, #8b5cf6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '-0.5px',
}

const tagline = {
  fontSize: '16px',
  color: '#cbd5e1',
  margin: '0',
  fontWeight: '400',
  letterSpacing: '0.5px',
}

// Modern Content Styles
const modernContent = {
  padding: '50px 40px',
  backgroundColor: '#ffffff',
}

const contentCard = {
  textAlign: 'center' as const,
}

const modernH1 = {
  color: '#1e293b',
  fontSize: '36px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
  letterSpacing: '-0.5px',
}

const modernText = {
  color: '#64748b',
  fontSize: '18px',
  lineHeight: '1.7',
  margin: '0 0 40px 0',
  textAlign: 'center' as const,
  maxWidth: '480px',
  marginLeft: 'auto',
  marginRight: 'auto',
}

// Modern Code Section Styles
const modernCodeSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
  padding: '40px 30px',
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  borderRadius: '20px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
}

const modernCodeLabel = {
  color: '#334155',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 30px 0',
}

const modernCodeContainer = {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
  margin: '30px 0',
  flexWrap: 'wrap' as const,
}

const modernDigitBox = {
  backgroundColor: '#ffffff',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  width: '56px',
  height: '70px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
  transition: 'all 0.2s ease',
}

const modernDigitText = {
  color: '#1e293b',
  fontSize: '32px',
  fontWeight: '700',
  fontFamily: '"SF Mono", "Monaco", "Menlo", monospace',
  margin: '0',
}

const modernCodeSubText = {
  color: '#64748b',
  fontSize: '15px',
  margin: '20px 0 0 0',
  fontStyle: 'normal',
}

// Modern Button & Notice Styles
const modernButtonSection = {
  textAlign: 'center' as const,
  margin: '50px 0 40px 0',
}

const modernButton = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '18px 40px',
  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
  transition: 'all 0.2s ease',
  border: 'none',
  letterSpacing: '0.5px',
}

const modernHr = {
  border: 'none',
  height: '1px',
  background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
  margin: '40px 0',
}

const securityNotice = {
  textAlign: 'center' as const,
  padding: '30px',
  backgroundColor: '#f8fafc',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
}

const noticeText = {
  color: '#475569',
  fontSize: '16px',
  margin: '0 0 8px 0',
  fontWeight: '500',
}

const noticeSubText = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
}

// Modern Footer Styles
const modernFooter = {
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  padding: '40px 30px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
}

const footerContent = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '16px',
}

const modernFooterText = {
  color: '#64748b',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  fontWeight: '500',
}

const footerLinks = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}

const modernLink = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: '600',
  transition: 'color 0.2s ease',
}

const footerSeparator = {
  color: '#cbd5e1',
  fontSize: '14px',
  margin: '0',
}

const footerTagline = {
  color: '#94a3b8',
  fontSize: '14px',
  margin: '0',
  fontStyle: 'italic',
}