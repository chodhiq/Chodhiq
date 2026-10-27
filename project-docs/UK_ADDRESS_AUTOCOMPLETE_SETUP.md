# UK address autocomplete setup

The app uses Postcodes.io for free postcode suggestions and the Ordnance Survey
Places API for full address suggestions. The OS API key is read only by the
Supabase Edge Function; it must not be added to Expo environment variables.

## Configure and deploy

1. Create an OS Data Hub API project, add OS Places, and generate a project API
   key. OS Places provides free-text address lookup and authoritative address
   records. Check the current OS Data Hub terms and usage limits for the project.
2. In the Supabase project, add the key as the Edge Function secret
   OS_PLACES_API_KEY.
3. Deploy supabase/functions/uk-address-suggestions to the same Supabase
   project used by the app.
4. Build and install the updated app. Address suggestions appear after three
   typed characters. Postcode suggestions continue to work if the OS secret is
   missing.

The function validates query size, limits results, applies the existing
persistent edge rate limiter per network address, and returns only the address
label, postcode, town, and coordinates required by the app.

Official references:

- [OS Places API](https://docs.os.uk/os-apis/accessing-os-apis/os-places-api)
- [OS Places find endpoint](https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/technical-specification/find)
- [Create an API project and key](https://docs.os.uk/os-apis/core-concepts/getting-started-with-an-api-project)
