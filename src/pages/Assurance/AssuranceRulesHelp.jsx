import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import FormModal from '../../components/FormModal';

// Short "How alarms work" guide for Assurance rules. Mirrors the backend's evaluate_rule /
// compute_alarm_decision / handle_ticket_automation (nms-backend assurance_blueprint.py) —
// keep this text in step with them. Given a `rule` (the wizard's live form values) it also
// shows that rule's own timings.

const Section = ({ title, children }) => (
    <section className="flex flex-col gap-1.5">
        <h3 className="text-ui-body font-semibold text-slate-800">{title}</h3>
        {children}
    </section>
);

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};

// Every check happens on a scheduler tick, so a real change is picked up up to one Frequency
// late — hence the ranges. Clearing always needs at least one more tick after the first healthy one.
const ruleTimings = (rule) => {
    const freq = toNum(rule?.frequency);
    if (!freq) return null;
    const threshold = toNum(rule.consecutive_breach_threshold) ?? 1;
    const stability = Number(rule.clear_stability_period_minutes) > 0 ? Number(rule.clear_stability_period_minutes) : 0;
    const clearMins = Math.max(1, Math.ceil(stability / freq)) * freq;
    const lines = [
        `Checks every ${freq} min`,
        threshold === 1
            ? `Raises an alarm the first time the problem shows up (within ${freq} min)`
            : `Raises an alarm if the problem shows up ${threshold} times in a row (about ${(threshold - 1) * freq}–${threshold * freq} min)`,
        `Clears the alarm once things stay normal for about ${clearMins} min`,
    ];
    if (!rule.generate_ticket) lines.push("Doesn't open tickets");
    else if (toNum(rule.verification_period_minutes)) lines.push(`Opens a ticket with the alarm. After you resolve it, it closes by itself if things stay normal for ${rule.verification_period_minutes} min`);
    else lines.push('Opens a ticket with the alarm. After you resolve it, someone has to close it');
    return lines;
};

export const AssuranceRulesHelpContent = ({ rule }) => {
    const timings = rule ? ruleTimings(rule) : null;
    return (
        <div className="flex flex-col gap-4 text-ui-body text-slate-600">
            {rule && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-ui-small font-semibold uppercase tracking-wide text-[#EC7D09] mb-1">This rule</p>
                    {timings ? (
                        <ul className="list-disc pl-5 space-y-0.5">
                            {timings.map((line) => <li key={line}>{line}</li>)}
                        </ul>
                    ) : (
                        <p>Set a Frequency (Step 3) to see timings.</p>
                    )}
                </div>
            )}

            <Section title="How it works">
                <ol className="list-decimal pl-5 space-y-0.5">
                    <li>Every few minutes the rule checks each cell against its conditions.</li>
                    <li>If all conditions are met, that cell has a problem.</li>
                    <li>If the problem repeats enough times in a row, an alarm is raised. One-off spikes are ignored.</li>
                    <li>When the cell is back to normal for long enough, the alarm clears.</li>
                    <li>A ticket opens with the alarm. After you resolve it, it closes by itself once the cell stays normal.</li>
                </ol>
            </Section>

            <Section title="Not seeing alarms?">
                <ul className="list-disc pl-5 space-y-0.5">
                    <li>Make sure the rule is enabled.</li>
                    <li>Check the rule's query (Step 5). If it fails, returns no data, or is missing a required column, the rule can't raise alarms.</li>
                </ul>
            </Section>

            <p className="text-ui-small text-slate-500">
                Turning a rule on or off takes about a minute. Other changes apply from its next check.
            </p>
        </div>
    );
};

/** `?` button that opens the guide. Pass `rule` (form values) to include that rule's timings. */
const AssuranceRulesHelp = ({ rule }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="How Assurance alarms work"
                aria-label="How Assurance alarms work"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#EC7D09] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
                <HelpCircle size={18} aria-hidden="true" />
            </button>
            <FormModal
                isOpen={open}
                setIsOpen={setOpen}
                title="How Assurance alarms work"
                icon={<HelpCircle size={16} />}
            >
                <AssuranceRulesHelpContent rule={rule} />
            </FormModal>
        </>
    );
};

export default AssuranceRulesHelp;
