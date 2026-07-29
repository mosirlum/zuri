"use client";

import { MessageSquare, Smartphone, Mail } from "lucide-react";

export default function CommunicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          Communication <em className="italic text-gold">Hub</em>
        </h1>
        <p className="text-muted text-sm mt-1">WhatsApp, SMS and email in one place.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[
          {
            icon: Smartphone,
            title: "WhatsApp Bot",
            desc: "Automated booking confirmations, reminders and receipts sent via WhatsApp Business API.",
            status: "Coming in Phase 2",
            color: "bg-green-50 border-green-200 text-green-600",
          },
          {
            icon: MessageSquare,
            title: "SMS Alerts",
            desc: "Document expiry alerts and booking notifications via Africa's Talking SMS gateway.",
            status: "Coming in Phase 2",
            color: "bg-blue-50 border-blue-200 text-blue-600",
          },
          {
            icon: Mail,
            title: "Email Notifications",
            desc: "Booking confirmations, invoices and compliance alerts sent directly to client emails.",
            status: "Coming in Phase 2",
            color: "bg-amber-50 border-amber-200 text-amber-600",
          },
        ].map(({ icon: Icon, title, desc, status, color }) => (
          <div key={title} className="bg-paper rounded-2xl border border-ink/10 p-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border mb-4 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-medium mb-2">{title}</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">{desc}</p>
            <span className="inline-block text-xs px-3 py-1.5 bg-paper-soft border border-ink/10 rounded-full text-muted font-medium">
              {status}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-paper rounded-2xl border border-ink/10 p-6">
        <h3 className="font-display text-xl font-medium mb-4">Quick WhatsApp Actions</h3>
        <p className="text-muted text-sm mb-5">While the bot is being set up, use these direct links to message drivers:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Message Khamis", phone: "255000000001" },
            { label: "Message Tony", phone: "255000000002" },
            { label: "Message Ally", phone: "255000000003" },
          ].map(({ label, phone }) => (
            <a key={phone} href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 hover:bg-green-100 transition-colors">
              <Smartphone className="w-4 h-4" />
              {label}
            </a>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">
          ⚠️ Update driver phone numbers in the Drivers section first, then update these links.
        </p>
      </div>
    </div>
  );
}
