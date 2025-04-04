class FriendService {
  static friends: IFriend[] = []

  static getFriends() {
    return this.friends
  }

  static async setFriends(friends: IFriend[]) {
    this.friends = friends
  }
}

export default FriendService
