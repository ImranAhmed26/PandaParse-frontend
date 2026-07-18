"use client";
//mounted is used to fix a server/client mismatch
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import useScroll from "@/lib/hooks/useScroll";
import { navLinkData } from "@/constants/AppConstants";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/hooks/useAuth";
// import DropdownMenu from '../interface/dropdown/NavMenu';
import CommonModal from "../Interface/modal/CommonModal";
import ThemeSwitch from "../Interface/CustomFeature/ThemeSwitch";
import Dropdown from "../Interface/Dropdown/Dropdown";
import { MenuItem } from "@headlessui/react";
import { NavLink } from "@/types/Home/banner";
import LanguageSwitch from "../Interface/CustomFeature/LanguageSwitch";

// type NavLink = {
//   name: string;
//   id: number;
//   value: string;
//   link: string;
// };

const PrimaryNavbar = () => {
  const [openModal, setOpenModal] = useState(false);

  const scrolled = useScroll(50);
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuth();
  // The auth store rehydrates from localStorage on the client, so the server
  // always renders logged-out. Gate the auth-dependent UI on `mounted` to avoid
  // a hydration mismatch (and a flash of "Sign in" for logged-in users).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleNavLinkClick = (link: string) => {
    router.push(link);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      logout();
      router.push("/");
    }
  };

  const firstName = user?.name?.trim().split(" ")[0] || "Account";

  return (
    <div
      className={`w-full flex justify-center sticky top-0 z-20 ${
        scrolled ? " bg-white/70  dark:bg-gray-900/70 backdrop-blur-xl" : "bg-white/0"
      }`}
    >
      <div className="w-full max-w-8xl h-20 px-10 text-lg font-medium flex gap-4 items-center justify-between">
        <div className="">
          <div className="lg:text-2xl font-bold drop-shadow-md">
            <Link href={"/"} aria-label="OCRParse — home">
              <Wordmark />
            </Link>
            {/* <Image src={PrimaryLogo} width={200} height={40} alt='Business Interaspect' /> */}
          </div>
        </div>
        <div className="hidden lg:flex gap-3 items-center">
          {navLinkData.map((navLink: NavLink, idx: number) => {
            return (
              <div key={idx}>
                {!navLink.dropdown ? (
                  <div
                    className={`
                capitalize text-lg  px-4 py-1 border-primary rounded-sm  hover:text-brandLight dark:hover:text-brandDark Light cursor-pointer`}
                    onClick={() => {
                      handleNavLinkClick(navLink.link);
                    }}
                  >
                    {navLink.name}
                  </div>
                ) : (
                  <Dropdown title={navLink.name}>
                    <div className="flex flex-col gap-2 p-0.5 items-start">
                      {navLink.options?.map((option: any, idx: number) => {
                        return (
                          <div
                            key={idx}
                            className="group dark:hover:bg-gray-800 hover:bg-gray-100 hover:text-brandLight dark:hover:text-brandDark text-left w-full p-1.5 rounded-2xl"
                          >
                            <MenuItem>
                              <button onClick={() => handleNavLinkClick(`${navLink.link}${option.link}`)} className="text-left">
                                <div>{option.name}</div>
                                <div className="text-sm text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white ">
                                  {option.details}
                                </div>
                              </button>
                            </MenuItem>
                          </div>
                        );
                      })}
                    </div>
                  </Dropdown>
                )}
              </div>
            );
          })}
        </div>
        <div className="justify-between flex lg:w-72 bg-red-10">
          <div className="lg:px-3 py-2.5 flex gap-2 justify-between items-center">
            {!mounted ? (
              // Placeholder keeps layout stable until auth state hydrates.
              <div className="px-2 h-6 w-16" aria-hidden />
            ) : isAuthenticated && user ? (
              <Dropdown title={firstName}>
                <div className="flex flex-col gap-1 p-1 items-start min-w-52">
                  <div className="px-2 py-1.5 w-full border-b border-gray-100 dark:border-gray-800">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user.name}</div>
                    <div className="text-sm text-gray-400 truncate">{user.email}</div>
                  </div>
                  <MenuItem>
                    <Link
                      href="/dashboard"
                      className="w-full text-left p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brandLight dark:hover:text-brandDark"
                    >
                      Dashboard
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      href="/profile"
                      className="w-full text-left p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brandLight dark:hover:text-brandDark"
                    >
                      Profile
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left p-2 rounded-2xl text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                      type="button"
                    >
                      Log out
                    </button>
                  </MenuItem>
                </div>
              </Dropdown>
            ) : (
              <Link href={"/auth/login"} className="px-2 font-semibold bg-white/0 text-brandLight dark:text-indigo-200">
                Sign in
              </Link>
            )}
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
          {/* <button
            className='w-1/2 text-base text-primaryLight hover:bg-primary hover:border-primary hover:text-brandLight dark:hover:text-brandDark font-semibold border border-primaryLight rounded-sm p-1 transition-all duration-100 drop-shadow-sm hidden lg:block'
            onClick={() => {
              setOpenModal(true);
            }}
          >
            Sign in
          </button> */}
          <CommonModal
            setIsOpen={setOpenModal}
            isOpen={openModal}
            subTitle=" Sign in using your email id."
            confirmBtnTitle="Sign In"
            confirmBtnFunction={() => {
              console.log("primary button clicked");
            }}
          >
            <div>Sign In form in progress</div>
          </CommonModal>
          {/* <div className="block lg:hidden">
            <NavbarMenu
              menuOptions={[
                ...navLinkData,
                {
                  name: "Sign In",
                  func: () => setOpenModal(true),
                },
              ]}
            />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default PrimaryNavbar;
