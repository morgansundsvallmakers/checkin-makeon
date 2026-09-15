export type AdminUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isCurrentUser?: boolean;
};

export type InviteAdminInput = {
  name: string;
  email: string;
};

export type AdminUserService = {
  list(): Promise<AdminUser[]>;
  invite(input: InviteAdminInput): Promise<AdminUser>;
  setActive(id: string, active: boolean): Promise<AdminUser>;
};

const initialAdmins: AdminUser[] = [
  {
    id: "demo-current-admin",
    name: "Anna Andersson",
    email: "anna@example.se",
    active: true,
    isCurrentUser: true,
  },
  {
    id: "demo-admin-2",
    name: "Bertil Berg",
    email: "bertil@example.se",
    active: true,
  },
  {
    id: "demo-admin-3",
    name: "Cecilia Carlsson",
    email: "cecilia@example.se",
    active: false,
  },
];

function clone(user: AdminUser): AdminUser {
  return { ...user };
}

export function createDemoAdminUserService(): AdminUserService {
  // Deliberately in-memory only. A Vercel preview using this service must never
  // write admin-user changes to the production Supabase project.
  let admins = initialAdmins.map(clone);

  return {
    async list() {
      return admins.map(clone);
    },

    async invite(input) {
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();

      if (!name || !email) {
        throw new Error("Namn och e-post måste anges.");
      }
      if (admins.some((admin) => admin.email.toLowerCase() === email)) {
        throw new Error("Det finns redan en administratör med den e-postadressen.");
      }

      const admin: AdminUser = {
        id: `demo-admin-${Date.now()}`,
        name,
        email,
        active: true,
      };
      admins = [...admins, admin];
      return clone(admin);
    },

    async setActive(id, active) {
      const target = admins.find((admin) => admin.id === id);
      if (!target) throw new Error("Administratören finns inte.");

      if (!active && target.isCurrentUser) {
        throw new Error("Du kan inte inaktivera ditt eget administratörskonto.");
      }

      if (!active) {
        const activeAdmins = admins.filter((admin) => admin.active).length;
        if (target.active && activeAdmins <= 1) {
          throw new Error("Den sista aktiva administratören kan inte inaktiveras.");
        }
      }

      admins = admins.map((admin) =>
        admin.id === id ? { ...admin, active } : admin,
      );
      return clone(admins.find((admin) => admin.id === id)!);
    },
  };
}
