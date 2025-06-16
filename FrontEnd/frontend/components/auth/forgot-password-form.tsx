'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  forgotPasswordSchema, 
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type ResetPasswordFormData 
} from '@/lib/validations/auth';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const emailForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onEmailSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await forgotPassword(data.email);
      setEmail(data.email);
      setStep('reset');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('UserNotFoundException')) {
          setError('No account found with this email address');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to send reset code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await confirmForgotPassword(email, data.code, data.password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('CodeMismatchException')) {
          setError('Invalid verification code');
        } else if (err.message.includes('ExpiredCodeException')) {
          setError('Verification code has expired');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await forgotPassword(email);
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-[1px]">
          <div className="bg-background">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center text-grey-600">
                {step === 'email' 
                  ? "Enter your email to receive a reset code"
                  : "Enter the code sent to your email"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 pb-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Email */}
                {step === 'email' && (
                  <motion.div
                    key="email"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-grey-700">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                          <Input
                            id="email"
                            type="email"
                            {...emailForm.register('email')}
                            className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                            placeholder="john.doe@example.com"
                          />
                        </div>
                        {emailForm.formState.errors.email && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                            {emailForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          </span>
                          {error}
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <Button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending code...
                            </>
                          ) : (
                            <>
                              Send Reset Code
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>

                        <Link href="/login">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full py-3 rounded-lg border-grey-200 hover:bg-grey-50 transition-all duration-200"
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Login
                          </Button>
                        </Link>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Step 2: Reset Password */}
                {step === 'reset' && !success && (
                  <motion.div
                    key="reset"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5">
                      <div className="text-center mb-4">
                        <p className="text-sm text-grey-600">
                          We sent a code to <strong>{email}</strong>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="code" className="text-sm font-medium text-grey-700">
                          Verification Code
                        </Label>
                        <Input
                          id="code"
                          {...resetForm.register('code')}
                          className="text-center text-2xl font-mono tracking-[0.3em] h-12 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                          placeholder="000000"
                          maxLength={6}
                        />
                        {resetForm.formState.errors.code && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                            {resetForm.formState.errors.code.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-grey-700">
                          New Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            {...resetForm.register('password')}
                            className="pl-10 pr-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {resetForm.formState.errors.password && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                            {resetForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-grey-700">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            {...resetForm.register('confirmPassword')}
                            className="pl-10 pr-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {resetForm.formState.errors.confirmPassword && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                            {resetForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          </span>
                          {error}
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <Button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Resetting password...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={resendCode}
                          disabled={isLoading}
                          className="w-full py-3 rounded-lg border-grey-200 hover:bg-grey-50 transition-all duration-200"
                        >
                          Resend Code
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setStep('email')}
                          disabled={isLoading}
                          className="w-full py-3 text-grey-600 hover:text-grey-800"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Change Email
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Success State */}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-8"
                  >
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-grey-900 mb-2">
                      Password Reset Successfully!
                    </h3>
                    <p className="text-sm text-grey-600 mb-4">
                      Redirecting you to login...
                    </p>
                    <Loader2 className="w-5 h-5 animate-spin text-pink-600 mx-auto" />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}