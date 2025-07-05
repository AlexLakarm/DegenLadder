import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, List, Text, Title } from "react-native-paper";

export default function DetailsScreen() {
  // --- Mock Data ---
  const scoreByPlatform = [
    { platform: "pump.fun", score: 800 },
    { platform: "letsbonk.fun", score: 537 },
  ];

  const pointsHistory = [
    { reason: "Good exit on $POPCAT", points: "+150", date: "2024-07-03" },
    { reason: "Rekt on $DUMDUM", points: "-50", date: "2024-07-02" },
    { reason: "Early entry on $WIF", points: "+200", date: "2024-07-01" },
    { reason: "Forgot to sell $PEPE", points: "-25", date: "2024-06-30" },
  ];
  // -----------------

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>DegenRank Details</Title>

      <Card style={styles.card}>
        <Card.Title title="Score par Plateforme" />
        <Card.Content>
          {scoreByPlatform.map((item, index) => (
            <List.Item
              key={index}
              title={item.platform}
              right={() => <Text variant="titleMedium">{item.score}</Text>}
            />
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Historique des Points" />
        <Card.Content>
          {pointsHistory.map((item, index) => (
            <List.Item
              key={index}
              title={item.reason}
              description={item.date}
              right={() => (
                <Text
                  variant="bodyLarge"
                  style={{
                    color: item.points.startsWith("+") ? "green" : "red",
                  }}
                >
                  {item.points}
                </Text>
              )}
            />
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    marginBottom: 24,
  },
});
