'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  personalInfoSchema,
  accountInfoSchema,
  verificationSchema,
  type PersonalInfoFormData,
  type AccountInfoFormData,
  type VerificationFormData,
} from '@/lib/validations/auth';

const steps = [
  { id: 1, title: 'Personal Information', description: 'Tell us about yourself' },
  { id: 2, title: 'Account Details', description: 'Create your account' },
  { id: 3, title: 'Verification', description: 'Verify your email' },
];

export function MultiStepSignUp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUp, confirmSignUp, resendConfirmationCode } = useAuth();

  // Step 1 Form
  const personalForm = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactNumber: formData.contactNumber,
    },
  });

  // Step 2 Form
  const accountForm = useForm<AccountInfoFormData>({
    resolver: zodResolver(accountInfoSchema),
    defaultValues: {
      email: formData.email,
      password: formData.password,
      confirmPassword: '',
    },
  });

  // Step 3 Form
  const verificationForm = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  const handlePersonalInfoSubmit = (data: PersonalInfoFormData) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  const handleAccountInfoSubmit = async (data: AccountInfoFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { email, password } = data;
      setFormData({ ...formData, ...data });
      
      await signUp(email, password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
      });
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (data: VerificationFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await confirmSignUp(formData.email, data.verificationCode);
      // Update user attributes after successful confirmation
      // This would be handled by the post-confirmation Lambda
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await resendConfirmationCode(formData.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 p-4">
      <Card className="w-full max-w-xl shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-[1px]">
          <div className="bg-background">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Create your account
              </CardTitle>
              <CardDescription className="text-center text-grey-600">
                Join us in just a few simple steps
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
          {/* Progress Steps */}
          <div className="mt-6 mb-8">
            <div className="relative flex items-center justify-center">
              {/* Progress Line Background */}
              <div className="absolute top-6 left-[15%] right-[15%] h-[2px] bg-grey-200" />
              
              {/* Progress Line Fill */}
              <div 
                className="absolute top-6 left-[15%] h-[2px] bg-pink-600 transition-all duration-500 ease-out"
                style={{ 
                  width: currentStep === 1 ? '0%' : currentStep === 2 ? '35%' : '70%',
                }} 
              />
              
              {/* Steps */}
              <div className="relative flex items-start justify-between w-full px-8">
                {steps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-background ${
                        currentStep > step.id
                          ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-200'
                          : currentStep === step.id
                          ? 'border-pink-600 text-pink-600 bg-pink-50 shadow-md'
                          : 'border-grey-300 text-grey-400 bg-white'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    {/* Step Label */}
                    <p className={`text-xs font-medium text-center mt-3 whitespace-nowrap ${
                      currentStep >= step.id ? 'text-grey-900' : 'text-grey-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-8 mb-6">
              <p className="text-lg font-semibold text-grey-900">
                {steps[currentStep - 1].title}
              </p>
              <p className="text-sm text-grey-500 mt-1">
                {steps[currentStep - 1].description}
              </p>
            </div>
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={personalForm.handleSubmit(handlePersonalInfoSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-grey-700">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                        <Input
                          id="firstName"
                          {...personalForm.register('firstName')}
                          className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                          placeholder="John"
                        />
                      </div>
                      {personalForm.formState.errors.firstName && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                          {personalForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-grey-700">
                        Last Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                        <Input
                          id="lastName"
                          {...personalForm.register('lastName')}
                          className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                          placeholder="Doe"
                        />
                      </div>
                      {personalForm.formState.errors.lastName && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                          {personalForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className="text-sm font-medium text-grey-700">
                      Contact Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                      <Input
                        id="contactNumber"
                        {...personalForm.register('contactNumber')}
                        className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                        placeholder="+1234567890"
                      />
                    </div>
                    {personalForm.formState.errors.contactNumber && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {personalForm.formState.errors.contactNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 2: Account Information */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={accountForm.handleSubmit(handleAccountInfoSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-grey-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                      <Input
                        id="email"
                        type="email"
                        {...accountForm.register('email')}
                        className="pl-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    {accountForm.formState.errors.email && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {accountForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-grey-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...accountForm.register('password')}
                        className="pl-10 pr-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {accountForm.formState.errors.password && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {accountForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...accountForm.register('confirmPassword')}
                        className="pl-10 pr-10 h-11 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {accountForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {accountForm.formState.errors.confirmPassword.message}
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

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBack}
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-lg border-grey-200 hover:bg-grey-50 transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Verification */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <Mail className="w-10 h-10 text-pink-600" />
                  </div>
                  <p className="text-grey-600 text-sm">
                    We've sent a verification code to
                  </p>
                  <p className="text-grey-900 font-semibold">{formData.email}</p>
                </div>

                <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode" className="text-sm font-medium text-grey-700 text-center block">
                      Enter 6-digit code
                    </Label>
                    <Input
                      id="verificationCode"
                      {...verificationForm.register('verificationCode')}
                      className="text-center text-3xl font-mono tracking-[0.5em] h-14 border-grey-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                      placeholder="000000"
                      maxLength={6}
                    />
                    {verificationForm.formState.errors.verificationCode && (
                      <p className="text-red-500 text-xs mt-1 flex items-center justify-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {verificationForm.formState.errors.verificationCode.message}
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

                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Email'
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="w-full py-3 rounded-lg border-grey-200 hover:bg-grey-50 transition-all duration-200"
                    >
                      Resend Code
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
            </CardContent>
            <CardFooter className="px-6 pb-6">
              <div className="text-center w-full">
                <p className="text-sm text-grey-600">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="text-pink-600 hover:text-pink-700 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </div>
  );
}