// Option lists shared by the Raise Ticket form (CreateTicketModal), the ticket detail popup's
// inline editing (ChatModal) and the Assurance module (Rule Builder, SLA profiles, escalation
// policies) — tickets and Assurance are one module, so severity/priority use one vocabulary.
// SEVERITIES is the backend-enforced assurance_rule.severity enum; Assurance-created tickets copy
// it verbatim. Older manual tickets may still carry S1–S4 — those still display and stay
// selectable wherever a stored value is kept as an extra option.
export const TELECOM_CONSTANTS = {
  TECHNOLOGY: ["2G", "3G", "4G", "5G"],
  ISSUE_CATEGORIES: ["RF", "Transmission", "Hardware", "Performance"],
  PRIORITIES: ["Critical", "High", "Medium", "Low"],
  SEVERITIES: ["Critical", "Major", "Minor", "Warning"],
  REGIONS: ["North", "South", "East", "West", "Central"],
  TEAMS: {
    RF: "RF Team",
    Transmission: "TX Team",
    Hardware: "Hardware Team",
    Performance: "Performance Team"
  }
};
