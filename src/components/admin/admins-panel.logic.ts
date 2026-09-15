export type AdminStatusTarget = {
  user_id: string;
  aktiv: boolean;
};

type AuthUserResult = {
  data: { user: { id: string } | null };
  error: unknown;
};

export async function identifyCurrentAdminUser(
  getUser: () => Promise<AuthUserResult>,
): Promise<string> {
  const { data, error } = await getUser();

  if (error || !data.user?.id) {
    throw new Error(
      "Kunde inte identifiera den inloggade användaren. Försök igen innan du ändrar administratörsstatus.",
      error ? { cause: error } : undefined,
    );
  }

  return data.user.id;
}

export function getAdminStatusChangeBlockReason(
  admin: AdminStatusTarget,
  currentUserId: string | null,
  activeAdminCount: number,
): string | null {
  if (!currentUserId) {
    return "Den inloggade användaren måste identifieras innan administratörsstatus kan ändras.";
  }
  if (admin.user_id === currentUserId) {
    return "Du kan inte inaktivera ditt eget administratörskonto.";
  }
  if (admin.aktiv && activeAdminCount <= 1) {
    return "Den sista aktiva administratören kan inte inaktiveras.";
  }
  return null;
}

export function createExclusiveAdminMutation() {
  let busy = false;

  return {
    isBusy: () => busy,
    async run<T>(operation: () => Promise<T>) {
      if (busy) return { started: false } as const;

      busy = true;
      try {
        return { started: true, value: await operation() } as const;
      } finally {
        busy = false;
      }
    },
  };
}

export function canCloseInviteModal(saving: boolean) {
  return !saving;
}
