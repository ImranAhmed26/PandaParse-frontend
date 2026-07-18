"use client";
import { useTranslations } from "next-intl";
import ThemeSwitch from "../Interface/CustomFeature/ThemeSwitch";
import LanguageDropdown from "../Interface/CustomFeature/LanguageSwitch";
import { useAuthStore } from "@/lib/auth/authStore";
import UserAvatar from "../Auth/UserAvatar";
import React from "react";

const AppNavbar = () => {
  const t = useTranslations("home");
  const { user, } = useAuthStore();

  return (
    <header className="flex justify-between h-16 items-center gap-4 border-b border-gray-200 dark:border-none bg-white dark:bg-quadraGray px-4">
      <div className="flex items-center">
        <div className="h-4 w-px bg-gray-300 mx-2" />
        <h1 className="text-lg font-semibold">{t("title")}</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <UserAvatar name={user.name} image={user.image} sizeClassName="h-8 w-8" textClassName="text-sm" />
          </div>
        )}

        <div className="flex gap-3 items-center">
          <LanguageDropdown />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
