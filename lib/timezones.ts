// African timezones
export const africanTimezones = [
  { value: "Africa/Abidjan", label: "Abidjan (GMT+0)" },
  { value: "Africa/Accra", label: "Accra (GMT+0)" },
  { value: "Africa/Addis_Ababa", label: "Addis Ababa (GMT+3)" },
  { value: "Africa/Algiers", label: "Algiers (GMT+1)" },
  { value: "Africa/Cairo", label: "Cairo (GMT+2)" },
  { value: "Africa/Casablanca", label: "Casablanca (GMT+1)" },
  { value: "Africa/Dakar", label: "Dakar (GMT+0)" },
  { value: "Africa/Dar_es_Salaam", label: "Dar es Salaam (GMT+3)" },
  { value: "Africa/Djibouti", label: "Djibouti (GMT+3)" },
  { value: "Africa/Harare", label: "Harare (GMT+2)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (GMT+2)" },
  { value: "Africa/Kampala", label: "Kampala (GMT+3)" },
  { value: "Africa/Khartoum", label: "Khartoum (GMT+2)" },
  { value: "Africa/Kinshasa", label: "Kinshasa (GMT+1)" },
  { value: "Africa/Lagos", label: "Lagos (GMT+1)" },
  { value: "Africa/Mogadishu", label: "Mogadishu (GMT+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (GMT+3)" },
  { value: "Africa/Tripoli", label: "Tripoli (GMT+2)" },
  { value: "Africa/Tunis", label: "Tunis (GMT+1)" }
]

// Major international timezones
export const internationalTimezones = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada) (GMT-7)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada) (GMT-6)" },
  { value: "America/Chicago", label: "Central Time (US & Canada) (GMT-5)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada) (GMT-4)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+2)" },
  { value: "Europe/Moscow", label: "Moscow (GMT+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kolkata", label: "New Delhi (GMT+5:30)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10)" },
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)" }
]

// Languages
export const languages = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "ar", label: "Arabic" },
  { value: "sw", label: "Swahili" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "de", label: "German" }
]

// Combine all timezones
export const allTimezones = [
  {
    label: "Africa",
    options: africanTimezones
  },
  {
    label: "International",
    options: internationalTimezones
  }
]
