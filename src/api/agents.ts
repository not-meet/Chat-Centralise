import express, { RequestHandler } from 'express'
import { Resend } from 'resend'
import { supabase } from '../lib/supabase-server'

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY)

const inviteHandler: RequestHandler = async (req, res) => {
    try {
        const { email, fullName, userId } = req.body

        if (!email || !fullName || !userId) {
            res.status(400).json({ error: 'Missing required fields' })
            return
        }

        // Generate a magic link that expires in 24 hours
        const { data, error: magicLinkError } =
            await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email,
                options: {
                    redirectTo: `${
                        process.env.VITE_APP_URL || 'http://localhost:8080'
                    }/set-password?userId=${userId}`,
                },
            })

        if (magicLinkError || !data) {
            console.error('Error generating magic link:', magicLinkError)
            res.status(500).json({ error: 'Failed to generate magic link' })
            return
        }

        // Send invitation email
        await resend.emails.send({
            from: 'ChatCentralize <onboarding@resend.dev>',
            to: email,
            subject: 'Welcome to ChatCentralize',
            html: `
      <h1>Welcome to ChatCentralize</h1>
      <p>Hi ${fullName},</p>
      <p>You've been invited to join ChatCentralize as an agent. Click the link below to set up your account:</p>
      <p><a href="${data.properties.action_link}">Set up your account</a></p>
      <p>This link will expire in 24 hours. If you don't set up your account within this time, you'll need to request a new invitation.</p>
      <p>If you didn't request this invitation, please ignore this email.</p>
    `,
        })

        res.status(200).json({ message: 'Invitation sent successfully' })
    } catch (error) {
        console.error('Error sending invitation:', error)
        res.status(500).json({ error: 'Failed to send invitation' })
    }
}

// Add a route to handle password setup and account activation
const activateHandler: RequestHandler = async (req, res) => {
    try {
        const { userId, password } = req.body

        if (!userId || !password) {
            res.status(400).json({ error: 'Missing required fields' })
            return
        }

        // Update user's password
        const { error: passwordError } =
            await supabase.auth.admin.updateUserById(userId, { password })

        if (passwordError) {
            console.error('Error updating password:', passwordError)
            res.status(500).json({ error: 'Failed to set password' })
            return
        }

        // Update user status to active
        const { error: updateError } = await supabase
            .from('users')
            .update({ status: 'active' })
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating user status:', updateError)
            res.status(500).json({ error: 'Failed to activate account' })
            return
        }

        // Update user metadata
        const { error: metadataError } =
            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: { status: 'active' },
            })

        if (metadataError) {
            console.error('Error updating user metadata:', metadataError)
            res.status(500).json({ error: 'Failed to update user metadata' })
            return
        }

        res.status(200).json({ message: 'Account activated successfully' })
    } catch (error) {
        console.error('Error activating account:', error)
        res.status(500).json({ error: 'Failed to activate account' })
    }
}

router.post('/invite', inviteHandler)
router.post('/activate', activateHandler)

export default router
