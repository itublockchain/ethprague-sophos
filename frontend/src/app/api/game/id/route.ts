import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "http://34.51.139.255:5000/api/game/changeID",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Response is not ok from server: ", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch game ID" },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Error: ", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("http://34.51.139.255:5000/api/game/id", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response is not ok from server: ", errorText);
      return NextResponse.json(
        { error: "Failed to fetch game ID" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error: ", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
