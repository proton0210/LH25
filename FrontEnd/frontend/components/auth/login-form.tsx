'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Mail, 
  Lock, 
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import Link from 'next/link';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, confirmSignUp, resendConfirmationCode } = useAuth();

  useEffect(() => {
    // Check if user was redirected after upgrade
    if (searchParams.get('upgraded') === 'true') {
      setShowUpgradeSuccess(true);
      // Hide the message after 5 seconds
      setTimeout(() => setShowUpgradeSuccess(false), 5000);
    }
  }, [searchParams]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);
    
    try {
      await resendConfirmationCode(confirmationEmail);
      alert('Confirmation code sent! Please check your email.');
    } catch (err) {
      setError('Failed to resend confirmation code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleConfirmAccount = async () => {
    if (!confirmationCode.trim()) {
      setError('Please enter the confirmation code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await confirmSignUp(confirmationEmail, confirmationCode);
      alert('Account confirmed successfully! You can now sign in.');
      setShowConfirmation(false);
      setConfirmationCode('');
      // Clear the form
      form.reset();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message.includes('CodeMismatchException') 
          ? 'Invalid confirmation code. Please try again.' 
          : err.message);
      } else {
        setError('Failed to confirm account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(data.email, data.password);
      router.push('/listings');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('UserNotFoundException')) {
          setError('No account found with this email address');
        } else if (err.message.includes('NotAuthorizedException')) {
          setError('Incorrect email or password');
        } else if (err.message.includes('UserNotConfirmedException')) {
          // User exists but hasn't confirmed their account
          setConfirmationEmail(data.email);
          setShowConfirmation(true);
          setError(null);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to sign in. Please try again.');
      }
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
              {showUpgradeSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">
                    Upgrade successful! Please sign in to access your Pro features.
                  </p>
                </div>
              )}
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back
              </CardTitle>
              <CardDescription className="text-center text-grey-600">
                Sign in to continue to your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 pb-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-grey-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-grey-700">
                      Password
                    </Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-xs text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...form.register('password')}
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
                  {form.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                      {form.formState.errors.password.message}
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

                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="px-6 pb-6">
              <div className="text-center w-full space-y-2">
                <p className="text-sm text-grey-600">
                  Don't have an account?{' '}
                  <Link 
                    href="/signup" 
                    className="text-pink-600 hover:text-pink-700 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle className="w-6 h-6" />
                <CardTitle className="text-xl">Confirm Your Account</CardTitle>
              </div>
              <CardDescription>
                Your account needs to be confirmed. We've sent a confirmation code to{' '}
                <span className="font-medium text-grey-900">{confirmationEmail}</span>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="confirmationCode">Confirmation Code</Label>
                <Input
                  id="confirmationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="mt-1"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmAccount}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm Account'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationCode('');
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-center pt-2 border-t">
                <p className="text-sm text-grey-600">
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className="text-pink-600 hover:text-pink-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}