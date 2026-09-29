"""Seed script: create default roles, permissions, and the SUPER_ADMIN user.

Idempotent - safe to run multiple times.

Usage:
    python -m scripts.seed_superadmin --username admin --password ChangeMe123!
"""
import argparse
import asyncio
import sys
from pathlib import Path

# Ensure the app package is importable when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import Permission, Role, RolePermission, User, UserRole  # noqa: E402


DEFAULT_ROLES = {
    "super_admin": "Full system access",
    "admin": "Administrative user with configurable permissions",
    "teacher": "Teacher - attendance for assigned classes",
    "student": "Student - view-only access to own attendance",
    "parent": "Parent/guardian - future role",
}


PERMISSIONS: list[tuple[str, str, str]] = [
    ("students.view", "students", "View students"),
    ("students.create", "students", "Create students"),
    ("students.edit", "students", "Edit students"),
    ("students.delete", "students", "Delete students"),
    ("students.import", "students", "Import students from CSV/Excel"),
    ("students.export", "students", "Export students"),
    ("teachers.view", "teachers", "View teachers"),
    ("teachers.manage", "teachers", "Create/edit/delete teachers"),
    ("classes.manage", "academics", "Manage education levels, grades, sections"),
    ("subjects.manage", "academics", "Manage subjects"),
    ("sessions.manage", "academics", "Manage academic sessions"),
    ("timetable.manage", "academics", "Manage timetables"),
    ("assignments.manage", "academics", "Manage teacher assignments"),
    ("attendance.view_all", "attendance", "View attendance for any class"),
    ("attendance.view_assigned", "attendance", "View attendance for assigned classes"),
    ("attendance.mark", "attendance", "Mark attendance"),
    ("attendance.edit_submitted", "attendance", "Edit submitted attendance"),
    ("attendance.review_ai", "attendance", "Review AI-recognized attendance"),
    ("attendance.configure", "attendance", "Configure attendance rules and thresholds"),
    ("reports.view", "reports", "View reports"),
    ("reports.export", "reports", "Export reports"),
    ("users.manage", "users", "Create/edit/disable users"),
    ("roles.manage", "users", "Manage roles and permissions"),
    ("settings.manage", "settings", "Manage system settings"),
    ("audit.view", "audit", "View audit logs"),
    ("ai.use_assistant", "ai", "Use the AI assistant"),
]


async def seed(username: str, password: str, email: str | None) -> None:
    async with SessionLocal() as db:
        # 1. Roles
        role_map: dict[str, Role] = {}
        for name, desc in DEFAULT_ROLES.items():
            existing = (
                await db.execute(select(Role).where(Role.name == name))
            ).scalar_one_or_none()
            if existing:
                role_map[name] = existing
            else:
                role = Role(name=name, description=desc, is_system=True)
                db.add(role)
                await db.flush()
                role_map[name] = role
                print(f"[+] Created role: {name}")

        # 2. Permissions
        perm_map: dict[str, Permission] = {}
        for code, category, desc in PERMISSIONS:
            existing = (
                await db.execute(select(Permission).where(Permission.code == code))
            ).scalar_one_or_none()
            if existing:
                perm_map[code] = existing
            else:
                p = Permission(code=code, category=category, description=desc)
                db.add(p)
                await db.flush()
                perm_map[code] = p
        print(f"[+] {len(perm_map)} permissions registered")

        # 3. Grant all permissions to super_admin
        super_role = role_map["super_admin"]
        existing_rps = (
            await db.execute(
                select(RolePermission.permission_id).where(
                    RolePermission.role_id == super_role.id
                )
            )
        ).scalars().all()
        existing_set = set(existing_rps)
        for p in perm_map.values():
            if p.id not in existing_set:
                db.add(RolePermission(role_id=super_role.id, permission_id=p.id))
        await db.flush()
        print("[+] super_admin has all permissions")

        # 4. SUPER_ADMIN user
        user = (
            await db.execute(select(User).where(User.username == username))
        ).scalar_one_or_none()

        if user is None:
            user = User(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                full_name="Super Administrator",
                is_superuser=True,
                must_change_password=True,
            )
            db.add(user)
            await db.flush()
            print(f"[+] Created SUPER_ADMIN user: {username}")
        else:
            print(f"[=] User '{username}' already exists - skipping creation")

        # 5. Attach super_admin role
        has_role = (
            await db.execute(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.role_id == super_role.id,
                )
            )
        ).scalar_one_or_none()
        if not has_role:
            db.add(UserRole(user_id=user.id, role_id=super_role.id))
            print("[+] Attached super_admin role to user")

        await db.commit()
        print("\nSeed complete.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--email", default=None)
    args = parser.parse_args()

    asyncio.run(seed(args.username, args.password, args.email))


if __name__ == "__main__":
    main()