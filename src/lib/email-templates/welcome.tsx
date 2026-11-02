import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { emailBrand as brand } from './brand'

export function ParentWelcomeEmail({ name }: { name?: string }) {
  return <Html lang="en" dir="ltr"><Head /><Preview>Your family is set up. Here’s where to find your parent controls.</Preview>
    <Body style={brand.body}><Container style={brand.container}>
      <Text style={{ ...brand.text, fontWeight: '800', fontSize: '24px' }}>Bugley</Text>
      <Heading style={brand.title}>Your family is ready</Heading>
      <Text style={brand.text}>{name ? `Hi ${name},` : 'Hi there,'} your family setup is complete. Your children can use their own PIN or picture password—no child email address needed.</Text>
      <Text style={brand.text}>In your Parent Hub, you can choose how long their login is remembered, set daily limits, and review their saved creations, recorded Studio conversations, and in-app safety notices.</Text>
      <Text style={brand.text}>For their tablet, open Settings in Bugley to pair the device and follow the home-screen setup steps. Keep your parent password private.</Text>
      <Button href="https://bugley.app/hub" style={brand.button}>Open your Parent Hub</Button>
      <Text style={brand.footer}>Safety notices currently appear inside Bugley. This welcome email does not switch on email alerts, and recorded activity is not a record of every interaction.</Text>
      <Hr style={{ borderColor: brand.border, margin: '28px 0' }} />
      <Text style={brand.footer}>Figure out AI, together.<br />No ads. We never sell your family’s data.</Text>
    </Container></Body></Html>
}

export const template = {
  component: ParentWelcomeEmail,
  subject: 'Your Bugley family is ready',
  displayName: 'Parent welcome',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry