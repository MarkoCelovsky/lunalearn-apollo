import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dimensions,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FlashList } from "@shopify/flash-list";
import { addDoc, getCountFromServer, onSnapshot, query, where } from "firebase/firestore";
import { dashboardGreeting } from "helperFunctions/index";

import BadgeIcon from "components/UI/BadgeIcon";
import { Heading } from "components/UI/Heading";
import { ListHeading } from "components/UI/ListHeading";
import { LoadingSpinner } from "components/UI/LoadingSpinner";
import { useAuth } from "context/auth-context";
import { Screens } from "screens/screen-names";
import { RootStackNavigatorParamList } from "schema/navigationTypes";
import { notificationsCol, stocksCol } from "utils/firebase.config";
import { CustomButton, CustomText } from "components/UI/CustomElements";
import { Image } from "expo-image";
import { SavedStock, Stock, UserPreference } from "schema/types";
import Slider from "@react-native-community/slider";
import {
    entertainmentStocks,
    gastronomyStocks,
    healthcareStocks,
    sportsStocks,
    technologyStocks,
} from "schema/data";
import { BuyStock } from "components/modals/BuyStock";

const mapStocks = (stocks: Stock[]) =>
    stocks.map((stock) => {
        const finalTotal = stock.priceChanges.reduce(
            (sum, change) => sum + change.changePercent,
            0,
        );
        return { ...stock, finalTotal };
    });

export const Dashboard = (): ReactElement => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { userId, user } = useAuth();
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [myStocks, setMyStocks] = useState<SavedStock[]>([]);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [messagesQty, setMessagesQty] = useState(0);
    const isFocused = useIsFocused();
    const { navigate } = useNavigation<NativeStackNavigationProp<RootStackNavigatorParamList>>();
    const { t } = useTranslation();

    const getNotificationCount = useCallback(async () => {
        let msgs = 0;
        const q = query(
            notificationsCol("notis" || ""),
            where("receiverId", "array-contains", userId),
        );
        const querySnapshot = await getCountFromServer(q);
        msgs = querySnapshot.data().count;
        setMessagesQty(msgs);
    }, [userId]);

    useEffect(() => {
        isFocused && getNotificationCount();
    }, [getNotificationCount, isFocused]);

    const openModalHandler = useCallback(() => {
        bottomSheetModalRef.current?.present();
    }, []);

    const handleCloseModal = useCallback(() => {
        bottomSheetModalRef.current?.close();
    }, []);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        ),
        [],
    );

    useEffect(() => {
        const q = query(stocksCol(userId || ""));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            try {
                setMyStocks(querySnapshot.docs.map((doc) => ({ ...doc.data(), docId: doc.id })));
            } catch (err) {
                console.error(err);
            }
        });
        return unsubscribe;
    }, [userId]);

    useEffect(() => {
        const getStocks = () => {
            switch (user?.userPreference) {
                case UserPreference.Entertainment:
                    setStocks(mapStocks(entertainmentStocks));
                    break;
                case UserPreference.Gastronomy:
                    setStocks(mapStocks(gastronomyStocks));
                    break;
                case UserPreference.Healthcare:
                    setStocks(mapStocks(healthcareStocks));
                    break;
                case UserPreference.Sports:
                    setStocks(mapStocks(sportsStocks));
                    break;
                case UserPreference.Technology:
                    setStocks(mapStocks(technologyStocks));
                    break;

                default:
                    setStocks(mapStocks(technologyStocks));
                    break;
            }
        };
        getStocks();
    }, [user?.userPreference]);

    const buyStock = async (amount: number, stock: Stock) => {
        try {
            await addDoc(stocksCol(userId || ""), { ...stock, amount });
            handleCloseModal();
        } catch (error) {
            console.error(error);
        }
    };

    // const showInstructorProfileHandler = (instructorId: string) => {
    //     handleCloseModal();
    //     navigate(Screens.InstructorProfile, {
    //         instructorId,
    //         drivingSchoolId: user?.drivingSchoolId ? user.drivingSchoolId : "",
    //     });
    // };

    const openStock = (stock: Stock) => {
        setSelectedStock(stock);
        openModalHandler();
    };

    if (!userId || !user) {
        return <LoadingSpinner />;
    }
    return (
        <SafeAreaView style={styles.rootContainer}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={() => {
                            getNotificationCount();
                        }}
                    />
                }
                contentContainerStyle={styles.scrollContainer}
            >
                <View style={styles.container}>
                    <View style={styles.headingContainer}>
                        <View className="flex-row items-center">
                            <Image
                                style={{ height: 60, width: 60, marginRight: 8 }}
                                source={{ uri: user.photoURL || "" }}
                                accessibilityIgnoresInvertColors
                            />
                            <View>
                                <Heading>{dashboardGreeting()},</Heading>
                                <CustomText category="h5">
                                    {user?.username.firstName + " "}
                                    {user?.username.lastName}
                                    👋
                                </CustomText>
                            </View>
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => navigate(Screens.Notifications)}
                            style={({ pressed }) => ({
                                opacity: pressed ? 0.5 : 1,
                                paddingLeft: 25,
                            })}
                        >
                            <View style={styles.iconContainer}>
                                <BadgeIcon badgeCount={messagesQty}>
                                    <Feather name="bell" size={34} color="black" />
                                </BadgeIcon>
                            </View>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.lessonList}>
                    <CustomText category="h4" className="p-4">
                        Recomendations
                    </CustomText>
                    <FlatList
                        data={stocks}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                accessibilityRole="button"
                                activeOpacity={0.5}
                                accessibilityIgnoresInvertColors
                                onPress={() => openStock(item)}
                            >
                                <Card item={item} />
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <View style={styles.lessonList}>
                    <ListHeading
                        heading="My assets:"
                        showAll
                        navigate={() => navigate(Screens.MyEquations)}
                    />

                    <View>
                        {myStocks.length ? (
                            <FlashList
                                data={myStocks}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalList}
                                estimatedItemSize={300}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        activeOpacity={0.5}
                                        accessibilityIgnoresInvertColors
                                    >
                                        <Card item={item} />
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <View className="h-40 w-full items-center justify-center">
                                <CustomText style={styles.nextEventHeading}>
                                    {t("You have no assets in place.")}
                                </CustomText>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.btn}>
                    <CustomButton size="giant" onPress={() => navigate(Screens.NewEquation)}>
                        Buy Stocks
                    </CustomButton>
                </View>

                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    index={0}
                    enableDynamicSizing
                    onDismiss={handleCloseModal}
                    backdropComponent={renderBackdrop}
                >
                    <BuyStock
                        stock={selectedStock}
                        handleCloseModal={handleCloseModal}
                        buyHandler={buyStock}
                    />
                </BottomSheetModal>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    rootContainer: { flex: 1 },
    modal: { padding: 16, paddingBottom: 32 },
    btn: { position: "absolute", bottom: 4, paddingHorizontal: 16, width: "100%" },
    lessonList: { marginTop: 10 },
    scrollContainer: { paddingTop: 16, flexGrow: 1 },
    container: { paddingHorizontal: 16 },
    nextEventHeading: { color: "gray", fontSize: 14 },
    cardCtr: { paddingRight: 16 },
    singleCard: { width: Dimensions.get("screen").width - 16, paddingRight: 16 },
    horizontalList: { paddingLeft: 16 },
    headingContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 6,
    },
    progressContainer: { flex: 1, flexDirection: "row", marginBottom: 20, gap: 8 },
    iconContainer: { flex: 1, justifyContent: "center" },
});

const Card = ({ item }: { item: Stock }) => (
    <View
        style={{
            backgroundColor: "#f5f5f5",
            borderColor: "#ddd",
            borderRadius: 8,
            marginRight: 8,
        }}
    >
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 16,
            }}
        >
            <View>
                <CustomText category="h6" style={{ color: "#000" }}>
                    {item.symbol}
                </CustomText>
                <CustomText category="p2" style={{ color: "#888" }}>
                    {item.companyName}
                </CustomText>
            </View>
            <View>
                <CustomText category="h6" style={{ color: "#000" }}>
                    {item.currentPrice.toFixed(2)}
                </CustomText>
                <CustomText
                    category="p2"
                    style={{
                        color: item.finalTotal && item.finalTotal > 0 ? "#008000" : "#ff0000",
                    }}
                >
                    {" "}
                    ({item.finalTotal > 0 ? "+" : ""}
                    {item.finalTotal.toFixed(2)}%)
                </CustomText>
            </View>
        </View>
    </View>
);
