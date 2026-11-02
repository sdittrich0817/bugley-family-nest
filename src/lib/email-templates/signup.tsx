import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import { emailBrand as brand } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Bugley. Verify your parent email to set up your family.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: '800', fontSize: '24px' }}>Bugley</Text>
        <Heading style={h1}>Welcome to Bugley</Heading>
        <Text style={text}>
          Let’s get your family ready to figure out AI, together with{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          First, verify your parent email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ). Your account stays inactive until you verify it.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Verify my parent email
        </Button>
        <Text style={{ ...text, marginTop: '24px' }}>Next, you’ll add your children and choose their PIN or picture password. You stay in charge of their access and can review recorded activity in your Parent Hub.</Text>
        <Text style={footer}>If the button doesn’t open, copy this secure link into your browser:<br /><Link href={confirmationUrl} style={{ ...link, wordBreak: 'break-all' }}>{confirmationUrl}</Link></Text>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={footer}>No ads. We never sell your family’s data.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = brand.body
const container = brand.container
const h1 = brand.title
const text = brand.text
const link = { color: 'inherit', textDecoration: 'underline' }
const button = brand.button
const footer = brand.footer
