const nodemailer = require('nodemailer');

const getEmailConfig = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || (user ? `TaskFlow <${user}>` : 'TaskFlow <no-reply@taskflow.local>');

  return { host, port, user, pass, from };
};

const isEmailConfigured = () => {
  const { host, user, pass } = getEmailConfig();
  return Boolean(host && user && pass);
};

let transporter;
const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const { host, port, user, pass } = getEmailConfig();
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();
  const { from } = getEmailConfig();

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Email not configured. Skipping email to ${to}.`);
    }
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const buildHtml = ({ title, subtitle, lines, details }) => {
  const body = (lines || [])
    .map((line) => `<p style="margin:0 0 12px 0;">${line}</p>`)
    .join('');
  const detailRows = (details || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 10px; color:#64748b; font-size:12px;">${item.label}</td>
          <td style="padding:6px 10px; font-weight:600; color:#0f172a;">${item.value}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="background:#f5f7fb; padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
        <tr>
          <td style="padding:20px 24px; border-bottom:1px solid #e2e8f0;">
            <div style="font-family:Arial, sans-serif; font-size:12px; letter-spacing:1px; color:#1e40af; font-weight:700;">TASKFLOW</div>
            <h2 style="margin:8px 0 0 0; font-family:Arial, sans-serif; font-size:18px; color:#0f172a;">${title}</h2>
            ${subtitle ? `<p style="margin:6px 0 0 0; color:#475569; font-size:13px;">${subtitle}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px; font-family:Arial, sans-serif; color:#0f172a; line-height:1.5;">
            ${body}
            ${detailRows ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px; border:1px solid #e2e8f0; border-radius:8px;">
                ${detailRows}
              </table>
            ` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px; border-top:1px solid #e2e8f0; font-family:Arial, sans-serif; font-size:12px; color:#64748b;">
            This message was sent by TaskFlow.
          </td>
        </tr>
      </table>
    </div>
  `;
};

const formatDate = (value) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const sendAdminWelcomeEmail = async ({ name, email }) => {
  const subject = 'Welcome to TaskFlow';
  const lines = [
    `Hi ${name},`,
    'Your admin account is ready. You can now create projects, invite members, and assign tasks.',
  ];
  await sendEmail({
    to: email,
    subject,
    text: [...lines, `Login email: ${email}`].join('\n\n'),
    html: buildHtml({
      title: 'Welcome to TaskFlow',
      subtitle: 'Your admin workspace is ready.',
      lines,
      details: [
        { label: 'Login email', value: email },
      ],
    }),
  });
};

const sendMemberInviteEmail = async ({ name, email, password, adminName, userId }) => {
  const subject = `Your TaskFlow access from ${adminName}`;
  const lines = [
    `Hi ${name},`,
    `${adminName} added you to TaskFlow.`,
    'Use the credentials below to sign in.',
  ];
  const passwordValue = password ? password : 'Use your current password';
  await sendEmail({
    to: email,
    subject,
    text: [
      ...lines,
      `User ID: ${userId}`,
      `Login email: ${email}`,
      `Password: ${passwordValue}`,
    ].join('\n\n'),
    html: buildHtml({
      title: 'TaskFlow access details',
      subtitle: `${adminName} created your access.`,
      lines,
      details: [
        { label: 'User ID', value: userId },
        { label: 'Login email', value: email },
        { label: 'Password', value: passwordValue },
        { label: 'Admin', value: adminName },
      ],
    }),
  });
};

const sendProjectMemberAddedEmail = async ({ name, email, projectName, adminName }) => {
  const subject = `Project access granted: ${projectName}`;
  const lines = [
    `Hi ${name},`,
    `${adminName} added you to the project "${projectName}".`,
    'You can now view project details and assigned tasks.',
  ];
  await sendEmail({
    to: email,
    subject,
    text: lines.join('\n\n'),
    html: buildHtml({
      title: 'Project access granted',
      subtitle: `Project: ${projectName}`,
      lines,
      details: [
        { label: 'Project', value: projectName },
        { label: 'Admin', value: adminName },
      ],
    }),
  });
};

const sendProjectMemberRemovedEmail = async ({ name, email, projectName, adminName }) => {
  const subject = `Removed from project: ${projectName}`;
  const lines = [
    `Hi ${name},`,
    `${adminName} removed you from the project "${projectName}".`,
    'If you believe this is a mistake, please contact your admin.',
  ];
  await sendEmail({
    to: email,
    subject,
    text: lines.join('\n\n'),
    html: buildHtml({
      title: 'Project access removed',
      subtitle: `Project: ${projectName}`,
      lines,
      details: [
        { label: 'Project', value: projectName },
        { label: 'Admin', value: adminName },
      ],
    }),
  });
};

const sendTeamMemberRemovedEmail = async ({ name, email, adminName }) => {
  const subject = `Removed from ${adminName}'s team`;
  const lines = [
    `Hi ${name},`,
    `${adminName} removed you from their TaskFlow team.`,
    'Your access to their projects has been revoked.',
  ];
  await sendEmail({
    to: email,
    subject,
    text: lines.join('\n\n'),
    html: buildHtml({
      title: 'Team access removed',
      subtitle: `Admin: ${adminName}`,
      lines,
      details: [
        { label: 'Admin', value: adminName },
      ],
    }),
  });
};

const sendTaskAssignedEmail = async ({ name, email, taskTitle, projectName, dueDate, priority, adminName }) => {
  const subject = `Task assigned: ${taskTitle}`;
  const lines = [
    `Hi ${name},`,
    `${adminName} assigned you a task in project "${projectName}".`,
  ];
  await sendEmail({
    to: email,
    subject,
    text: [
      ...lines,
      `Task: ${taskTitle}`,
      `Priority: ${priority || 'Medium'}`,
      `Due date: ${formatDate(dueDate)}`,
    ].join('\n\n'),
    html: buildHtml({
      title: 'New task assigned',
      subtitle: `Project: ${projectName}`,
      lines,
      details: [
        { label: 'Task', value: taskTitle },
        { label: 'Priority', value: priority || 'Medium' },
        { label: 'Due date', value: formatDate(dueDate) },
        { label: 'Admin', value: adminName },
      ],
    }),
  });
};

module.exports = {
  sendAdminWelcomeEmail,
  sendMemberInviteEmail,
  sendProjectMemberAddedEmail,
  sendProjectMemberRemovedEmail,
  sendTeamMemberRemovedEmail,
  sendTaskAssignedEmail,
};
