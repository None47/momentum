"use client";

interface MedicalAlertProps {
  missedMeds: string[];
}

export default function MedicalAlert({ missedMeds }: MedicalAlertProps) {
  if (missedMeds.length === 0) return null;

  return (
    <div className="bg-[#1a0808] border border-[#ef4444]/30 rounded-sm px-4 py-3 mb-4">
      <p className="text-[11px] text-[#ef4444] font-medium">
        {missedMeds.length === 1
          ? `${missedMeds[0].toUpperCase()} NOT TAKEN — This affects everything. Take it now.`
          : `${missedMeds.length} MEDICATIONS MISSED — ${missedMeds.join(", ")}. Take them now.`}
      </p>
    </div>
  );
}
