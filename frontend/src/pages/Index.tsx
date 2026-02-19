import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Donut } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { isPro } from "@/lib/pro";
import AuthButton from "@/components/AuthButton";

const Index = () => {
  const [userIsPro, setUserIsPro] = useState(false);

  useEffect(() => {
    setUserIsPro(isPro());
  }, []);
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-orange-500">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                CodeTrack
              </span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8 text-sm">
              <Link to="/practice" className="text-white hover:text-orange-400 transition-colors">Practice</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {userIsPro ? (
              <Badge className="bg-500 text-white px-3 py-1">
                <Donut className="h-4 w-4 mr-1" />
                Donate
              </Badge>
            ) : null}
            <AuthButton className="text-white hover:text-orange-400 hover:bg-gray-800" />
            {/* <div className="w-8 h-8 rounded-full bg-gray-600"></div> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-6xl font-bold text-white mb-4">
              CodeTrack
            </h1>
            <h2 className="text-4xl font-semibold text-white mb-6 max-w-2xl">
              A better way to prepare
              <br />
              <span className="text-gray-400">for coding interviews.</span>
            </h2>
            <div className="mt-8">
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg"
                asChild
              >
                <Link to="/practice">
                  {userIsPro ? "Continue Practicing" : "Start Practicing"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;