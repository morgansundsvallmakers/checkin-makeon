export const ADMIN_INVITATION_UNCONFIRMED_MESSAGE =
  "Inbjudningsmejlet kan ha skickats, men administratörsåtkomsten kunde inte bekräftas. Kontrollera administratörslistan innan du försöker igen.";

type OperationError = {
  message: string;
};

type OperationResult<T> = {
  data: T;
  error: OperationError | null;
};

type InvitedUser = {
  id: string;
  email?: string;
  created_at?: string;
};

type AdminRole = {
  id: string;
  user_id: string;
  aktiv: boolean;
};

type CompleteAdminInvitationOptions = {
  callerId: string;
  email: string;
  name: string;
  redirectTo: string;
  inviteUserByEmail: (
    email: string,
    options: { data: { name: string }; redirectTo: string },
  ) => Promise<OperationResult<{ user: InvitedUser | null }>>;
  grantAdminRole: (args: {
    _caller_id: string;
    _target_user_id: string;
  }) => Promise<OperationResult<AdminRole | null>>;
  logError?: (message: string, details: Record<string, string>) => void;
};

export async function completeAdminInvitation({
  callerId,
  email,
  name,
  redirectTo,
  inviteUserByEmail,
  grantAdminRole,
  logError = console.error,
}: CompleteAdminInvitationOptions) {
  const { data: inviteData, error: inviteError } = await inviteUserByEmail(email, {
    data: { name },
    redirectTo,
  });
  if (inviteError) throw inviteError;

  const invitedUser = inviteData.user;
  if (!invitedUser) {
    logError("[inviteAdmin] Auth invitation returned no user", {
      callerUserId: callerId,
    });
    throw new Error(ADMIN_INVITATION_UNCONFIRMED_MESSAGE);
  }

  const { data: role, error: roleError } = await grantAdminRole({
    _caller_id: callerId,
    _target_user_id: invitedUser.id,
  });

  if (roleError || !role) {
    logError("[inviteAdmin] Admin role could not be confirmed after Auth invitation", {
      callerUserId: callerId,
      invitedUserId: invitedUser.id,
      reason: roleError?.message ?? "RPC returned no administrator role",
    });
    throw new Error(ADMIN_INVITATION_UNCONFIRMED_MESSAGE);
  }

  return {
    id: role.id,
    user_id: role.user_id,
    aktiv: role.aktiv,
    email: invitedUser.email ?? email,
    name,
    created_at: invitedUser.created_at ?? null,
  };
}
