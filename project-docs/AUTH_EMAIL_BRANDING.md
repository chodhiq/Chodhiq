# ChodhiQ authentication email branding

Use a dedicated sending subdomain such as `auth.example.com` and a sender such as `no-reply@auth.example.com`.

## Supabase hosted configuration

1. Verify the sending domain with the selected SMTP provider.
2. In Supabase Authentication email settings, enable custom SMTP.
3. Set the sender display name to `ChodhiQ`.
4. Set the From address to the verified ChodhiQ sender.
5. Configure the provider SMTP host, port, username and password in Supabase. Never store the password in this repository.
6. Set the confirmation subject to `Confirm your ChodhiQ account` and paste `supabase/templates/confirmation.html` into the Confirm signup template.
7. Set the recovery subject to `Reset your ChodhiQ password` and paste `supabase/templates/recovery.html` into the Reset password template.
8. Send a signup and recovery email to a test address and confirm the sender, subject, links, mobile layout and spam placement.

Keep authentication email separate from future marketing email to protect deliverability.
