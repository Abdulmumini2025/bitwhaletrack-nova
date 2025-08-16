import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
              About CryptoNews
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your trusted source for the latest cryptocurrency news, market analysis, 
              and blockchain insights from around the world.
            </p>
          </div>

          {/* Mission Section */}
          <Card className="glass mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-semibold mb-6 text-center">Our Mission</h2>
              <p className="text-lg text-muted-foreground text-center leading-relaxed">
                We believe in democratizing access to cryptocurrency information. Our platform 
                provides real-time market data, breaking news, and expert analysis to help both 
                newcomers and seasoned traders make informed decisions in the dynamic world of 
                digital assets.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">Real-Time Data</h3>
                <p className="text-muted-foreground">
                  Live cryptocurrency prices and market data powered by CoinGecko API.
                </p>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">Breaking News</h3>
                <p className="text-muted-foreground">
                  Stay updated with the latest developments in the crypto space.
                </p>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">AI Assistant</h3>
                <p className="text-muted-foreground">
                  Get instant answers to your crypto questions with our AI chatbot.
                </p>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">Community Driven</h3>
                <p className="text-muted-foreground">
                  Users can submit news articles and engage with the community.
                </p>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">Expert Analysis</h3>
                <p className="text-muted-foreground">
                  In-depth market analysis and trend predictions from crypto experts.
                </p>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">Mobile Friendly</h3>
                <p className="text-muted-foreground">
                  Fully responsive design for seamless browsing on any device.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Creator Section */}
          <Card className="glass text-center">
            <CardContent className="p-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6">
                <span className="text-2xl font-bold text-white">A</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Created by Abdulmumini</h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Passionate about blockchain technology and committed to providing the crypto 
                community with reliable, up-to-date information and tools for navigating 
                the digital asset landscape.
              </p>
              
              <div className="flex justify-center space-x-4">
                <Badge variant="secondary" className="text-sm px-4 py-2">
                  Blockchain Developer
                </Badge>
                <Badge variant="secondary" className="text-sm px-4 py-2">
                  Crypto Enthusiast
                </Badge>
                <Badge variant="secondary" className="text-sm px-4 py-2">
                  Full Stack Engineer
                </Badge>
              </div>

              <div className="flex justify-center space-x-6 mt-8">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Github className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-6 w-6" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};