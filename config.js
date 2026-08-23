// EmailJS configuration — see README.md "Set up EmailJS" for how to get these.
// PUBLIC_KEY is safe to expose in client-side code; it's meant to be public.
// In the EmailJS dashboard, restrict it to your app's domain (Account > Security)
// once the app is deployed, so it can't be used to send from other sites.
window.EMAILJS_CONFIG = {
  PUBLIC_KEY: "REPLACE_WITH_EMAILJS_PUBLIC_KEY",
  SERVICE_ID: "REPLACE_WITH_EMAILJS_SERVICE_ID",
  TEMPLATE_ID: "REPLACE_WITH_EMAILJS_TEMPLATE_ID"
};
