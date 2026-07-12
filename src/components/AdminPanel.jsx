import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { listUsers } from "../server";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  async function loadUsers() {
    const users = await listUsers();
    setUsers(users);
  }

  async function loadRoles() {
    const { data, error } = await supabase.from("user_roles").select("*");
    if (!error) setRoles(data);
  }

  function isAdmin(userId) {
    return roles.some(r => r.user_id === userId && r.role === "admin");
  }

  async function addAdmin(userId) {
    await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    loadRoles();
  }

  async function removeAdmin(userId) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    loadRoles();
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Adminpanel</h2>

      <table className="table w-full">
        <thead>
          <tr>
            <th>Email</th>
            <th>User ID</th>
            <th>Roll</th>
            <th>Åtgärd</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.id}</td>
              <td>{isAdmin(u.id) ? "Admin" : "User"}</td>
              <td>
                {isAdmin(u.id) ? (
                  <button className="btn btn-error" onClick={() => removeAdmin(u.id)}>
                    Ta bort admin
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => addAdmin(u.id)}>
                    Gör till admin
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
