import type {
  EmailNotification,
  NotificationTemplate,
  PolicyChangeNotification,
  SystemNotification,
} from "@/types/notifications"
import type { Patient } from "@/types/hospital"

export class NotificationService {
  // Mock email templates
  private static templates: NotificationTemplate[] = [
    {
      id: "policy-change-template",
      name: "Policy Change Notification",
      type: "policy_change",
      subject: "Important: Changes to Your Insurance Policy",
      content: `
Dear {{patientName}},

We want to inform you about important changes to your insurance policy that may affect your current treatment plan.

Policy Details:
- Insurance Provider: {{insuranceProvider}}
- Policy Number: {{policyNumber}}
- Change Type: {{changeType}}
- Effective Date: {{effectiveDate}}

Change Description:
{{changeDescription}}

{{#if affectedTreatments}}
Affected Treatments:
{{#each affectedTreatments}}
- {{this}}
{{/each}}
{{/if}}

What This Means for You:
{{impactDescription}}

Next Steps:
- Review your updated coverage details in the patient portal
- Contact your insurance provider if you have questions
- Speak with your healthcare provider about alternative treatment options if needed

If you have any questions or concerns, please don't hesitate to contact us at (555) 123-4567 or visit our patient portal.

Best regards,
Healthcare Management Team
      `,
      variables: [
        "patientName",
        "insuranceProvider",
        "policyNumber",
        "changeType",
        "effectiveDate",
        "changeDescription",
        "affectedTreatments",
        "impactDescription",
      ],
    },
    {
      id: "treatment-update-template",
      name: "Treatment Update Notification",
      type: "treatment_update",
      subject: "Update on Your Treatment Plan",
      content: `
Dear {{patientName}},

We have an important update regarding your treatment plan.

Treatment Plan: {{treatmentPlanName}}
Update Type: {{updateType}}
Date: {{updateDate}}

Details:
{{updateDescription}}

{{#if actionRequired}}
Action Required:
{{actionDescription}}
{{/if}}

Please log into your patient portal to view the complete details or contact us if you have any questions.

Best regards,
{{doctorName}}
{{hospitalName}}
      `,
      variables: [
        "patientName",
        "treatmentPlanName",
        "updateType",
        "updateDate",
        "updateDescription",
        "actionRequired",
        "actionDescription",
        "doctorName",
        "hospitalName",
      ],
    },
  ]

  static async sendPolicyChangeNotification(
    patient: Patient,
    changeType: PolicyChangeNotification["changeType"],
    changeDescription: string,
    effectiveDate: string,
    affectedTreatments: string[] = [],
  ): Promise<EmailNotification> {
    const template = this.templates.find((t) => t.type === "policy_change")
    if (!template) {
      throw new Error("Policy change template not found")
    }

    const emailNotification: EmailNotification = {
      id: `email-${Date.now()}`,
      recipientId: patient.id,
      recipientEmail: patient.email,
      recipientName: patient.name,
      type: "policy_change",
      subject: template.subject,
      content: this.processTemplate(template.content, {
        patientName: patient.name,
        insuranceProvider: patient.insuranceProvider,
        policyNumber: patient.policyNumber,
        changeType: changeType.replace("_", " ").toUpperCase(),
        effectiveDate,
        changeDescription,
        affectedTreatments,
        impactDescription: this.getImpactDescription(changeType, affectedTreatments),
      }),
      sentDate: new Date().toISOString(),
      status: "sent",
      templateId: template.id,
    }

    // Simulate email sending
    console.log(`[v0] Sending email to ${patient.email}:`, emailNotification.subject)

    return emailNotification
  }

  static async createSystemNotification(
    userId: string,
    userRole: "hospital" | "patient",
    type: SystemNotification["type"],
    title: string,
    message: string,
    priority: SystemNotification["priority"] = "medium",
    actionRequired = false,
    actionUrl?: string,
  ): Promise<SystemNotification> {
    const notification: SystemNotification = {
      id: `notif-${Date.now()}`,
      userId,
      userRole,
      type,
      title,
      message,
      priority,
      read: false,
      actionRequired,
      actionUrl,
      createdDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }

    console.log(`[v0] Created system notification for user ${userId}:`, notification.title)

    return notification
  }

  private static processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template

    // Simple template processing (in a real app, use a proper template engine)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      processed = processed.replace(regex, String(value))
    })

    // Handle arrays (simplified)
    if (variables.affectedTreatments && Array.isArray(variables.affectedTreatments)) {
      if (variables.affectedTreatments.length > 0) {
        const treatmentList = variables.affectedTreatments.map((t) => `- ${t}`).join("\n")
        processed = processed.replace(
          /{{#if affectedTreatments}}[\s\S]*?{{\/if}}/g,
          `Affected Treatments:\n${treatmentList}`,
        )
      } else {
        processed = processed.replace(/{{#if affectedTreatments}}[\s\S]*?{{\/if}}/g, "")
      }
    }

    return processed
  }

  private static getImpactDescription(
    changeType: PolicyChangeNotification["changeType"],
    affectedTreatments: string[],
  ): string {
    switch (changeType) {
      case "coverage_removed":
        return affectedTreatments.length > 0
          ? "The listed treatments are no longer covered by your insurance plan. You may need to pay out-of-pocket or explore alternative treatment options."
          : "Some coverage has been removed from your plan. Please review your policy details for specifics."
      case "coverage_added":
        return "New coverage has been added to your plan, which may reduce your out-of-pocket costs for certain treatments."
      case "premium_change":
        return "Your monthly premium has changed. Please review your billing information and contact your insurance provider for details."
      case "deductible_change":
        return "Your deductible amount has changed, which may affect how much you pay before insurance coverage begins."
      default:
        return "Please review the changes and contact your insurance provider if you have questions."
    }
  }
}
