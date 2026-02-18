import { useState, useEffect } from "react";
import { Team } from "@/types/team";
import { loadTeamData } from "@/lib/indexedDB";

export function useTeamData() {
  const [teamData, setTeamData] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeamData()
      .then((data) => {
        setTeamData(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // Get unique team names filtered by category
  const getTeamsByCategory = (category: "RITEL" | "FEEDER") => {
    const teams = teamData.filter((t) => t.category === category);
    const uniqueNames = [...new Set(teams.map((t) => t.teamName))];
    return uniqueNames.sort();
  };

  // Get teams that match a specific hostname OLT
  const getTeamsByHostname = (hostname: string, category?: "RITEL" | "FEEDER") => {
    const normalizedHostname = hostname.toLowerCase().trim();
    let filtered = teamData.filter(
      (t) => t.hostnameOlt.toLowerCase().trim() === normalizedHostname
    );
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    const uniqueNames = [...new Set(filtered.map((t) => t.teamName))];
    return uniqueNames.sort();
  };

  // Get all unique team names
  const getAllTeams = () => {
    const uniqueNames = [...new Set(teamData.map((t) => t.teamName))];
    return uniqueNames.sort();
  };

  return {
    teamData,
    isLoading,
    getTeamsByCategory,
    getTeamsByHostname,
    getAllTeams,
  };
}
