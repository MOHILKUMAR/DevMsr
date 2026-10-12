/**
 * Remembers where a visitor came from (UTM parameters and the external
 * referrer of the first page) for this browser tab only, so a quote request
 * made a few pages later can still be attributed to the campaign.
 * Nothing is sent anywhere until the visitor submits a form.
 */
const KEY = 'devmsr-attribution';

try {
  if (!sessionStorage.getItem(KEY)) {
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : '';
    const data = {
      utmSource: params.get('utm_source')?.slice(0, 100) ?? '',
      utmMedium: params.get('utm_medium')?.slice(0, 100) ?? '',
      utmCampaign: params.get('utm_campaign')?.slice(0, 150) ?? '',
      referrer: referrer.slice(0, 500),
    };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  }
} catch {
  /* storage unavailable: attribution is optional */
}
