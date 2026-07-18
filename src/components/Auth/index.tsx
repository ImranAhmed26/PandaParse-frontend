
// "use client";

// import type React from "react";
// import { useState } from "react";
// import { motion } from "framer-motion";
// import ASSET from "../../../../public/assets/asset-02.png";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     // Simulate API call
//     await new Promise((resolve) => setTimeout(resolve, 1500));

//     console.log("Login attempt:", { email, password });
//     setIsLoading(false);
//   };

//   const handleGoogleSignIn = () => {
//     console.log("Google sign in clicked");
//   };

//   const handleForgotPassword = () => {
//     console.log("Forgot password clicked");
//   };

//   const handleCreateAccount = () => {
//     console.log("Create account clicked");
//   };

//   return (
//     <div className="lg:min-h-[70dvh] flex items-center justify-center lg:p-4 lg:my-2">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.5, ease: "easeOut" }}
//         className="w-full max-w-md sm:max-w-xl lg:max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
//       >
//         <div className="flex flex-col lg:flex-row min-h-[500px] min-w-[350px]">
//           {/* Left Side - Illustration */}
//           <div className="flex-1 bg-gradient-to-br from-indigo-100 to-violet-100 p-0 lg:px-2 flex flex-col justify-between relative overflow-hidden">
//             {/* Floating Animation Elements */}
//             <motion.div
//               animate={{
//                 y: [0, -10, 0],
//                 rotate: [0, 5, 0],
//               }}
//               transition={{
//                 duration: 4,
//                 repeat: Number.POSITIVE_INFINITY,
//                 ease: "easeInOut",
//               }}
//               className="absolute top-16 left-10 w-6 h-6 lg:w-8 lg:h-8 bg-violet-100 rounded-full opacity-60"
//             />

//             <motion.div
//               animate={{
//                 y: [0, 15, 0],
//                 x: [0, 5, 0],
//               }}
//               transition={{
//                 duration: 5,
//                 repeat: Number.POSITIVE_INFINITY,
//                 ease: "easeInOut",
//                 delay: 1,
//               }}
//               className="absolute top-4 lg:top-32 right-20 w-5 h-5 lg:w-6 lg:h-6 bg-indigo-600 rounded-full opacity-50"
//             />

//             {/* Main Illustration */}
//             <motion.div
//               initial={{ opacity: 0, x: -50 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.8, delay: 0.2 }}
//               className="flex-1 flex items-center justify-center"
//             >
//               <img
//                 src={ASSET.src}
//                 alt="Student studying with academic elements"
//                 className="w-full lg:rounded-2xl h-36 sm:h-40 object-cover object-[0_18%] lg:h-auto lg:object-contain"
//               />
//             </motion.div>
//           </div>

//           {/* Right Side - Login Form */}
//           <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
//             <motion.div
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.3 }}
//               className="max-w-md mx-auto w-full"
//             >
//               {/* Logo */}
//               <div className="text-center mb-7">
//                 <motion.div
//                   initial={{ opacity: 0, y: -20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: 0.5 }}
//                   className="flex items-center justify-center space-x-2 mb-2"
//                 >
//                   <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
//                       <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                   <span className="text-2xl font-bold text-gray-800">
//                     <span className="text-indigo-500">OCR</span>Parse
//                   </span>
//                 </motion.div>
//               </div>

//               {/* Login Form */}
//               <form onSubmit={handleSubmit} className="space-y-5">
//                 <motion.div
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: 0.6 }}
//                 >
//                   <label className="block text-sm font-medium text-gray-600 mb-2">Username or email</label>
//                   <input
//                     type="text"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     className="w-full px-4 py-2 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 text-gray-800"
//                     placeholder="johnsmith007"
//                   />
//                 </motion.div>

//                 <motion.div
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: 0.7 }}
//                 >
//                   <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
//                   <input
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     className="w-full px-4 py-2 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 text-gray-800"
//                     placeholder="••••••••••••"
//                   />
//                   <div className="text-right mt-1">
//                     <button
//                       type="button"
//                       onClick={handleForgotPassword}
//                       className="text-sm text-indigo-500 hover:text-indigo-600 transition-colors duration-200"
//                     >
//                       Forgot password?
//                     </button>
//                   </div>
//                 </motion.div>

//                 <motion.button
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: 0.8 }}
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   type="submit"
//                   disabled={isLoading}
//                   className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-70"
//                 >
//                   {isLoading ? (
//                     <motion.div
//                       animate={{ rotate: 360 }}
//                       transition={{
//                         duration: 1,
//                         repeat: Number.POSITIVE_INFINITY,
//                         ease: "linear",
//                       }}
//                       className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
//                     />
//                   ) : (
//                     "Sign in"
//                   )}
//                 </motion.button>

//                 {/* Divider */}
//                 <motion.div
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   transition={{ duration: 0.5, delay: 0.9 }}
//                   className="relative my-6"
//                 >
//                   <div className="absolute inset-0 flex items-center">
//                     <div className="w-full border-t border-gray-200"></div>
//                   </div>
//                   <div className="relative flex justify-center text-sm">
//                     <span className="px-4 bg-white text-gray-500">or</span>
//                   </div>
//                 </motion.div>

//                 {/* Google Sign In */}
//                 <motion.button
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: 1.0 }}
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   type="button"
//                   onClick={handleGoogleSignIn}
//                   className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
//                 >
//                   <svg className="w-5 h-5" viewBox="0 0 24 24">
//                     <path
//                       fill="#4285F4"
//                       d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                     />
//                     <path
//                       fill="#34A853"
//                       d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                     />
//                     <path
//                       fill="#FBBC05"
//                       d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                     />
//                     <path
//                       fill="#EA4335"
//                       d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                     />
//                   </svg>
//                   <span>Sign in with Google</span>
//                 </motion.button>

//                 {/* Create Account Link */}
//                 <motion.div
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   transition={{ duration: 0.5, delay: 1.1 }}
//                   className="text-center"
//                 >
//                   <span className="text-gray-600">Are you new? </span>
//                   <button
//                     type="button"
//                     onClick={handleCreateAccount}
//                     className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors duration-200 underline"
//                   >
//                     Create an Account
//                   </button>
//                 </motion.div>
//               </form>
//             </motion.div>
//           </div>
//         </div>
//       </motion.div>
//     </div>
//   );
// }
