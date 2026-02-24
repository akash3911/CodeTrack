import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
                CodeTrack
              </span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8 text-sm">
              <Link to="/practice" className="text-gray-700 hover:text-orange-500 font-medium transition-colors">Practice</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {userIsPro ? (
              <Badge className="bg-pink-500 text-white px-3 py-1 font-semibold">
                Donate
              </Badge>
            ) : null}
            <AuthButton className="text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium" />
            {/* <div className="w-8 h-8 rounded-full bg-gray-600"></div> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent mb-4">
              CodeTrack
            </h1>
            <h2 className="text-4xl font-semibold text-gray-800 mb-6 max-w-2xl">
              Level up your
              <br />
              <span className="text-transparent bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text">coding skills</span>
            </h2>
            <div className="mt-8">
              <Button 
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg"
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