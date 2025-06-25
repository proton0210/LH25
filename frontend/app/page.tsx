import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
  Brain, 
  ShieldCheck, 
  PiggyBank, 
  TrendingUp,
  Users,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Star,
  Building2,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      icon: Brain,
      title: "Bedrock-AI Driven Insights",
      description: "Get intelligent market analysis, property valuations, and data-driven insights powered by AWS Bedrock-AI",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: ShieldCheck,
      title: "Verified Buyers & Sellers",
      description: "Every user is thoroughly verified ensuring safe and secure transactions for all parties",
      gradient: "from-pink-500 to-red-500"
    },
    {
      icon: PiggyBank,
      title: "Zero Brokerage",
      description: "Save thousands with our direct buyer-seller platform. No hidden fees, no middlemen",
      gradient: "from-cyan-500 to-blue-500"
    }
  ];

  const stats = [
    { value: "50K+", label: "Active Properties" },
    { value: "98%", label: "Customer Satisfaction" },
    { value: "$0", label: "Brokerage Fees" },
    { value: "24/7", label: "Bedrock-AI Support" }
  ];


  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Home Buyer",
      content: "Found my dream home in just 2 weeks! The Bedrock-AI insights helped me make the right decision.",
      rating: 5,
      image: "PS"
    },
    {
      name: "Rahul Verma",
      role: "Property Seller",
      content: "Sold my property 40% faster than traditional methods. Zero commission!",
      rating: 5,
      image: "RV"
    },
    {
      name: "Anita Desai",
      role: "First-time Buyer",
      content: "The verification process gave me confidence. Best platform for safe deals.",
      rating: 5,
      image: "AD"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-grey-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-grey-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-pink-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Lambda Houses
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 opacity-50" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Bedrock-AI Powered Real Estate Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-grey-900 mb-6 leading-tight">
              Find Your Dream Home with{' '}
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Zero Brokerage
              </span>
            </h1>
            <p className="text-xl text-grey-600 mb-8 max-w-2xl mx-auto">
              Lambda Houses provides Bedrock-AI driven insights for smart property decisions and connects you directly with verified owners. 
              No agents, no commissions, just intelligent real estate.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-lg">
                <Link href="/signup">
                  Start Free Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Floating Cards Animation */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-grey-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-grey-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-grey-900 mb-4">
              Why Choose Lambda Houses?
            </h2>
            <p className="text-lg text-grey-600 max-w-2xl mx-auto">
              We're revolutionizing real estate with technology and transparency
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-grey-200 hover:border-pink-300 transition-all duration-300 hover:shadow-xl group">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-full h-full text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-grey-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-grey-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-lg text-grey-600 max-w-2xl mx-auto">
              Join thousands of satisfied buyers and sellers
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-grey-200 hover:shadow-xl transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.image}
                    </div>
                    <div>
                      <h4 className="font-semibold text-grey-900">{testimonial.name}</h4>
                      <p className="text-sm text-grey-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-grey-700 italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-pink-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Find Your Dream Home?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Join Lambda Houses today and experience the future of real estate
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/70">
              No credit card required • Free forever for buyers
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-grey-900 text-white">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <div className="max-w-md mx-auto text-center">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Building2 className="w-6 h-6 text-pink-400" />
                <span className="text-xl font-bold">Lambda Houses</span>
              </div>
              <p className="text-grey-400 text-sm">
                The first Bedrock-AI powered, zero-brokerage real estate platform
              </p>
            </div>
          </div>
          
          <div className="border-t border-grey-800 pt-8 text-center text-sm text-grey-400">
            <p>
              Made for 2025 AWS Lambda Hackathon with ❤️ by{' '}
              <a 
                href="https://www.linkedin.com/in/vidit-shah/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 transition-colors"
              >
                Vidit
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}